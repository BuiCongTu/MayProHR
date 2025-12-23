
package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.List;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollDetailDTO;
import fpt.aptech.springbootapp.entities.ModuleA.AttendanceStatus;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeePayrollRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import fpt.aptech.springbootapp.entities.ModuleC.TbProductionLine;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.AttendanceRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketEmployeeRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionLineRepo;
import fpt.aptech.springbootapp.repositories.ModuleD_Leave.LeaveRequestRepo;
import fpt.aptech.springbootapp.services.System.HolidayService;

@Service
@Primary
public class PayrollCalculationServiceImp implements PayrollCalculationService {

    private final AttendanceRepository attendsRepo;
    private final OvertimeTicketEmployeeRepository otTERepo;
    private final ProductionLineRepo prodLineRepo;
    private final fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo employeeProductionRepo;
    private final LeaveRequestRepo leaveRequestRepo;
    private final HolidayService holidayService;
    private final PersonalIncomeTaxCalService taxCalculationService;
    private final EmployeeTaxProfileService taxProfileService;
    private final EmployeePayrollRepo employeePayrollRepo;

    private static final BigDecimal HOURS_PER_DAY = new BigDecimal("8");
    private static final BigDecimal STANDARD_WORKING_DAYS = new BigDecimal("26");
    private static final BigDecimal HOURS_PER_MONTH = new BigDecimal("176");  // 26 * 8
    private static final BigDecimal LATE_PENALTY = new BigDecimal("50000");
    private static final int SCALE = 2;

    @Autowired
    public PayrollCalculationServiceImp(
            AttendanceRepository attendsRepo,
            OvertimeTicketEmployeeRepository otTERepo,
            ProductionLineRepo prodLineRepo,
            fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo employeeProductionRepo,
            HolidayService holidayService,
            LeaveRequestRepo leaveRequestRepo,
            PersonalIncomeTaxCalService taxCalculationService,
            EmployeeTaxProfileService taxProfileService,
            EmployeePayrollRepo employeePayrollRepo) {
        this.attendsRepo = attendsRepo;
        this.otTERepo = otTERepo;
        this.prodLineRepo = prodLineRepo;
        this.employeeProductionRepo = employeeProductionRepo;
        this.holidayService = holidayService;
        this.leaveRequestRepo = leaveRequestRepo;
        this.taxCalculationService = taxCalculationService;
        this.taxProfileService = taxProfileService;
        this.employeePayrollRepo = employeePayrollRepo;
    }

    //tinh luong full cho employee
    @Override
    public PayrollCalculationDTO calEmpSalary(TbUser user, LocalDate payrollMonth, BigDecimal allowance) {
        PayrollCalculationDTO payDto = new PayrollCalculationDTO();
        payDto.setUserId(user.getId());
        payDto.setUserName(user.getFullName());
        payDto.setSalaryType(user.getSalaryType().toString());
        payDto.setBaseSalary(user.getBaseSalary());
        payDto.setStandardWorkingDays(STANDARD_WORKING_DAYS);

        //lấy hệ số lương theo từng nhân viên từ DB
        payDto.setWageCoefficient(user.getWageCoefficient() != null ? user.getWageCoefficient() : new BigDecimal("1"));

        YearMonth yearMonth = YearMonth.from(payrollMonth);

        //1. luong Time
        BigDecimal timeSalary = calTimeSalary(user, yearMonth, payDto);
        payDto.setTimeSalary(timeSalary);

        //2. luong ProductBonus
        BigDecimal productBonus = calProductBonus(user, yearMonth, payDto);
        payDto.setProductBonus(productBonus);

        //3. luong OT
        BigDecimal overtimePay = calOvertimePay(user, yearMonth, payDto);
        payDto.setOvertimePay(overtimePay);

        //lấy các giờ và weight. workingDays lấy từ actualWorkingDays đã tính trong calTimeSalary
        payDto.setWorkingDays(payDto.getActualWorkingDays());

        // Giờ thường  = workingDays * 8
        BigDecimal regularHours = (payDto.getWorkingDays() != null)
                ? payDto.getWorkingDays().multiply(HOURS_PER_DAY)
                : BigDecimal.ZERO;
        payDto.setRegularHours(regularHours);

        // Tách OT ngày thường và OT ngày lễ/chủ nhật
        HoursSplit split = splitOvertimeHours(user, yearMonth);
        payDto.setOtWeekdayHours(split.weekdayHours);
        payDto.setOtHolidayHours(split.holidayHours);

        // weight = (regularHours + otWeekdayHours*1.5 + otHolidayHours*2.0) * wageCoefficient
        BigDecimal weight = regularHours
                .add(split.weekdayHours.multiply(new BigDecimal("1.5")))
                .add(split.holidayHours.multiply(new BigDecimal("2.0")))
                .multiply(payDto.getWageCoefficient());
        payDto.setWeight(weight.setScale(SCALE, RoundingMode.HALF_UP));

        //4. tinh khau tru
        BigDecimal deductions = calDeductions(user, yearMonth, payDto);
        payDto.setTotalDeduction(deductions);

        //5. Lợi nhuận xử lý tính thuế và phụ cấp dựa vào loại lương
        BigDecimal allowanceValue = allowance != null ? allowance : BigDecimal.ZERO;
        payDto.setAllowance(allowanceValue);

        if (user.getSalaryType() == TbUser.SalaryType.TimeBased) {
            // TimeBased: dùng timeSalary + OT (không dùng baseSalary)
            BigDecimal incomeBeforeTax = timeSalary.add(overtimePay);
            payDto.setGrossIncomeForTax(incomeBeforeTax);

            BigDecimal incomeAfterDeductions = incomeBeforeTax.subtract(deductions);
            payDto.setIncomeAfterDeductions(incomeAfterDeductions);

            // Gọi engine thuế với incomeBeforeTax (không bao gồm allowance)
            TaxCalculationDTO taxDTO = calPersonalIncomeTax(user, incomeBeforeTax, payrollMonth);
            payDto.setTaxCalculation(taxDTO);

            // Thu nhập ròng trước phụ cấp
            BigDecimal netBeforeAllowance = incomeAfterDeductions.subtract(taxDTO.getTotalTax());

            // Cộng phụ cấp sau thuế
            BigDecimal totalPay = netBeforeAllowance.add(allowanceValue);

            payDto.setCalculationNote(
                    String.format(
                            "TimeBased: timeSalary(%.0f) + overtimePay(%.0f) - deduction(%.0f) - tax(%.0f) + allowance(%.0f) = %.0f",
                            timeSalary, overtimePay, deductions, taxDTO.getTotalTax(), allowanceValue, totalPay
                    )
            );

            payDto.setTotalPay(totalPay.setScale(SCALE, RoundingMode.HALF_UP));

        } else { // ProductBased
            BigDecimal incomeBeforeTax = user.getBaseSalary()
                    .add(productBonus)
                    .add(overtimePay);
            payDto.setGrossIncomeForTax(incomeBeforeTax);

            BigDecimal incomeAfterDeductions = incomeBeforeTax.subtract(deductions);
            payDto.setIncomeAfterDeductions(incomeAfterDeductions);

            TaxCalculationDTO taxDTO = calPersonalIncomeTax(user, incomeBeforeTax, payrollMonth);
            payDto.setTaxCalculation(taxDTO);

            BigDecimal netBeforeAllowance = incomeAfterDeductions.subtract(taxDTO.getTotalTax());

            BigDecimal totalPay = netBeforeAllowance.add(allowanceValue);

            payDto.setCalculationNote(
                    String.format(
                            "ProductBased: baseSalary(%.0f) + productBonus(%.0f) + overtimePay(%.0f) - deduction(%.0f) - tax(%.0f) + allowance(%.0f) = %.0f",
                            user.getBaseSalary(), productBonus, overtimePay,
                            deductions, taxDTO.getTotalTax(), allowanceValue, totalPay
                    )
            );

            payDto.setTotalPay(totalPay.setScale(SCALE, RoundingMode.HALF_UP));
        }

        return payDto;
    }

    //tinh luong TimeBase với xử lý phép tích lũy
    @Override
    public BigDecimal calTimeSalary(TbUser user, YearMonth yearMonth, PayrollCalculationDTO payDto) {
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();
        LocalDate startOfYear = LocalDate.of(yearMonth.getYear(), 1, 1);
        LocalDate endOfPrevMonth = startDate.minusDays(1);

        // Đếm ngày muộn
        List<TbAttendance> lateAttendances = attendsRepo
                .findByUserAndDateBetweenAndStatus(user, startDate, endDate, AttendanceStatus.LATE);
        int lateCount = lateAttendances.size();
        payDto.setLateCount(lateCount);

        // === TÍNH QUOTA PHÉP TÍCH LŨY ===
        // Công ty quy định: tháng N → nhân viên được N ngày phép/năm
        int monthValue = yearMonth.getMonthValue();
        BigDecimal earnedLeaveDays = new BigDecimal(monthValue);
        payDto.setEarnedLeaveDays(earnedLeaveDays);

        // Tính ngày phép đã dùng từ đầu năm đến hết tháng trước
        List<TbLeaveRequest> approvedLeavesYtd = leaveRequestRepo
                .findByUserAndStatusAndStartDateBetween(
                        user,
                        TbLeaveRequest.LeaveStatus.approved,
                        startOfYear, endOfPrevMonth);

        BigDecimal usedLeaveDaysYtd = BigDecimal.ZERO;
        for (TbLeaveRequest leave : approvedLeavesYtd) {
            long days = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
            usedLeaveDaysYtd = usedLeaveDaysYtd.add(new BigDecimal(days));
        }

        BigDecimal remainingLeaveQuota = earnedLeaveDays.subtract(usedLeaveDaysYtd);
        if (remainingLeaveQuota.compareTo(BigDecimal.ZERO) < 0) {
            remainingLeaveQuota = BigDecimal.ZERO;
        }
        payDto.setRemainingLeaveQuota(remainingLeaveQuota);

        // Lấy ngày nghỉ có phép trong tháng hiện tại
        List<TbLeaveRequest> approvedLeavesInMonth = leaveRequestRepo
                .findByUserAndStatusAndStartDateBetween(
                        user,
                        TbLeaveRequest.LeaveStatus.approved,
                        startDate, endDate);

        BigDecimal approvedLeaveDaysInMonth = BigDecimal.ZERO;
        for (TbLeaveRequest leave : approvedLeavesInMonth) {
            long days = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
            approvedLeaveDaysInMonth = approvedLeaveDaysInMonth.add(new BigDecimal(days));
        }

        // Tách paid/unpaid leaves
        BigDecimal paidLeaveDays = approvedLeaveDaysInMonth.min(remainingLeaveQuota);
        BigDecimal unpaidLeaveDays = approvedLeaveDaysInMonth.subtract(paidLeaveDays);
        if (unpaidLeaveDays.compareTo(BigDecimal.ZERO) < 0) {
            unpaidLeaveDays = BigDecimal.ZERO;
        }

        payDto.setApprovedLeaveDays(approvedLeaveDaysInMonth);
        payDto.setPaidLeaveDays(paidLeaveDays);
        payDto.setUnpaidLeaveDays(unpaidLeaveDays);
        payDto.setLatePenalty(LATE_PENALTY);

        // Tính lương thời gian: chỉ unpaidLeaveDays mới trừ công
        BigDecimal actualWorkingDays = STANDARD_WORKING_DAYS.subtract(unpaidLeaveDays);
        payDto.setActualWorkingDays(actualWorkingDays);

        BigDecimal dailySalary = user.getBaseSalary().divide(STANDARD_WORKING_DAYS, SCALE, RoundingMode.HALF_UP);
        BigDecimal timeSalary = dailySalary.multiply(actualWorkingDays)
                .subtract(LATE_PENALTY.multiply(new BigDecimal(lateCount)));

        return timeSalary.setScale(SCALE, RoundingMode.HALF_UP);
    }

    //tinh luong ProductBase
    @Override
    public BigDecimal calProductBonus(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
        if (user.getSalaryType() != TbUser.SalaryType.ProductBased || user.getLine() == null) {
            return BigDecimal.ZERO;
        }
        LocalDate monthDate = yearMonth.atDay(1);

        // 1) Prefer employee-specific production if exists
        var empProds = employeeProductionRepo.findByEmployeeAndMonth(user.getId(), monthDate);
        if (!empProds.isEmpty()) {
            BigDecimal total = BigDecimal.ZERO;
            BigDecimal totalOt = getTotalOvertimeHours(user, yearMonth);
            BigDecimal C = HOURS_PER_MONTH.add(totalOt);

            for (var ep : empProds) {
                BigDecimal A = new BigDecimal(ep.getProductCount())
                        .multiply(ep.getUnitPrice() != null ? ep.getUnitPrice() : ep.getProduction().getUnitPrice());
                BigDecimal productSalaryPerHour = A.divide(C, SCALE, RoundingMode.HALF_UP);
                BigDecimal bonus = productSalaryPerHour.multiply(HOURS_PER_MONTH);
                total = total.add(bonus);

                dto.setProductCount(ep.getProductCount());
                dto.setUnitPrice(ep.getUnitPrice() != null ? ep.getUnitPrice() : ep.getProduction().getUnitPrice());
            }

            return total.setScale(SCALE, RoundingMode.HALF_UP);
        }

        // 2) Fallback to subline-based allocation if no employee-specific input
        List<TbProductionLine> productionLines = prodLineRepo
                .findByMonthAndSubline(monthDate, user.getLine().getId());
        if (productionLines.isEmpty()) {
            return BigDecimal.ZERO;
        }

        BigDecimal totalProductBonus = BigDecimal.ZERO;
        BigDecimal totalOvertimeHours = getTotalOvertimeHours(user, yearMonth);
        for (TbProductionLine pl : productionLines) {
            BigDecimal A = new BigDecimal(pl.getProduction().getProductCount())
                    .multiply(pl.getProduction().getUnitPrice());
            BigDecimal B = A.multiply(new BigDecimal(pl.getCountContribution()));
            BigDecimal C = HOURS_PER_MONTH.add(totalOvertimeHours);
            BigDecimal productSalaryPerHour = B.divide(C, SCALE, RoundingMode.HALF_UP);
            BigDecimal bonus = productSalaryPerHour.multiply(HOURS_PER_MONTH);
            totalProductBonus = totalProductBonus.add(bonus);

            dto.setProductCount(pl.getProduction().getProductCount());
            dto.setUnitPrice(pl.getProduction().getUnitPrice());
            dto.setCountContribution(pl.getCountContribution());
        }
        return totalProductBonus.setScale(SCALE, RoundingMode.HALF_UP);
    }

    //tinh luong OT
    @Override
    public BigDecimal calOvertimePay(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
        BigDecimal totalOvertimeHours = getTotalOvertimeHours(user, yearMonth);
        dto.setOvertimeHours(totalOvertimeHours);

        if (totalOvertimeHours.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal averageMultiplier = getAvgOvertimeMultiplier(user, yearMonth);

        BigDecimal hourlyRate = user.getBaseSalary().divide(HOURS_PER_MONTH, SCALE, RoundingMode.HALF_UP);
        BigDecimal overtimePay = totalOvertimeHours
                .multiply(hourlyRate)
                .multiply(averageMultiplier);

        return overtimePay.setScale(SCALE, RoundingMode.HALF_UP);
    }

    //tinh Deduction
    @Override
    public BigDecimal calDeductions(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
        BigDecimal totalDeduction = BigDecimal.ZERO;

        //Bao Hiem 10.5% bao gồm bảo hiểm xã hội + bảo hiểm y tế + bảo hiểm thất nghiêp
        BigDecimal insurance = user.getBaseSalary()
                .multiply(new BigDecimal("10.5"))
                .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);
        dto.setInsurance(insurance);
        totalDeduction = totalDeduction.add(insurance);

        //phat late
        BigDecimal latePenalty = LATE_PENALTY.multiply(new BigDecimal(dto.getLateCount() != null ? dto.getLateCount() : 0));
        totalDeduction = totalDeduction.add(latePenalty);

        return totalDeduction.setScale(SCALE, RoundingMode.HALF_UP);
    }


    //tinh thue tncn
    @Override
    public TaxCalculationDTO calPersonalIncomeTax(
            TbUser user,
            BigDecimal grossIncome,
            LocalDate payrollMonth) {
        return taxCalculationService.calculatePersonalIncomeTax(user, grossIncome, payrollMonth);
    }

    //lay tong gio tang ca trong thang
    @Override
    public BigDecimal getTotalOvertimeHours(TbUser user, YearMonth yearMonth) {
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
                .findByEmployeeAndStatusAndTicketDateBetween(
                        user,
                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
                        startDate,
                        endDate);

        BigDecimal totalHours = BigDecimal.ZERO;
        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
            if (overtimeRequest == null) {
                continue;
            }

            LocalTime startTime = overtimeRequest.getStartTime();
            LocalTime endTime = overtimeRequest.getEndTime();
            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);
            totalHours = totalHours.add(hours);
        }

        return totalHours;
    }

    //tinh multiplier OT trung binh trong thang
    @Override
    public BigDecimal getAvgOvertimeMultiplier(TbUser user, YearMonth yearMonth) {
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
                .findByEmployeeAndStatusAndTicketDateBetween(
                        user,
                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
                        startDate,
                        endDate);

        BigDecimal totalMultiplier = BigDecimal.ZERO;
        BigDecimal totalHours = BigDecimal.ZERO;

        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
            if (overtimeRequest == null) {
                continue;
            }

            LocalTime startTime = overtimeRequest.getStartTime();
            LocalTime endTime = overtimeRequest.getEndTime();
            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);

            BigDecimal multiplier = holidayService.getOvertimeMultiplier(overtimeRequest.getOvertimeDate());
            totalMultiplier = totalMultiplier.add(multiplier.multiply(hours));
            totalHours = totalHours.add(hours);
        }

        if (totalHours.compareTo(BigDecimal.ZERO) <= 0) {
            return new BigDecimal("1.5");
        }

        return totalMultiplier.divide(totalHours, SCALE, RoundingMode.HALF_UP);
    }

    @Override
    public PayrollDetailDTO getPayrollDetailForDisplay(Integer employeePayrollId) {
        var ep = employeePayrollRepo.findById(employeePayrollId)
                .orElseThrow(() -> new RuntimeException("Employee payroll not found"));

        TbUser user = ep.getUser();
        PayrollDetailDTO detail = new PayrollDetailDTO().builder()
                .employeePayrollId(ep.getId())
                .payrollId(ep.getPayroll().getId())
                .payrollMonth(ep.getPayroll().getMonth())
                .departmentName(ep.getPayroll().getDepartment().getName())
                .userId(user.getId())
                .fullName(user.getFullName())
                .salaryType(user.getSalaryType().toString())
                .hireDate(user.getHireDate())
                .baseSalary(ep.getBaseSalary())
                .wageCoefficient(user.getWageCoefficient())

                // Dữ liệu TimeBased
                .standardWorkingDays(ep.getStandardWorkingDays())
                .actualWorkingDays(ep.getActualWorkingDays())
                .paidLeaveDays(ep.getPaidLeaveDays())
                .unpaidLeaveDays(ep.getUnpaidLeaveDays())
                .lateCount(ep.getLateCount())
                .latePenalty(ep.getLatePenalty())
                .timeSalary(ep.getBaseSalary() != null && ep.getActualWorkingDays() != null
                        ? ep.getBaseSalary()
                        .divide(STANDARD_WORKING_DAYS, SCALE, RoundingMode.HALF_UP)
                        .multiply(ep.getActualWorkingDays())
                        : BigDecimal.ZERO)

                // Dữ liệu ProductBased
                .productBonus(ep.getProductBonus())

                // Dữ liệu chung cả 2 loại
                .ot1Hours(ep.getOt1Hours())
                .ot2Hours(ep.getOt2Hours())
                .overtimePay(ep.getOvertimePay())
                .insurance(ep.getDeduction())
                .totalDeduction(ep.getDeduction())
                .grossIncomeForTax(ep.getGrossIncomeForTax())
                .personalIncomeTax(ep.getPersonalIncomeTax())
                .taxDeductionTotal(ep.getTaxDeductionTotal())
                .allowance(ep.getAllowance())
                .totalPay(ep.getTotalPay())
                .note(ep.getNote())
                .createdAt(ep.getCreatedAt())
                .build();


        return detail;
    }

    @Override
    public boolean validatePayrollData(TbUser user, LocalDate payrollMonth) {
        // Kiểm tra user không null
        if (user == null || user.getId() == null) {
            return false;
        }

        // Kiểm tra salary type hợp lệ
        if (user.getSalaryType() == null) {
            return false;
        }

        // Kiểm tra tháng hợp lệ (không quá tương lai)
        LocalDate today = LocalDate.now();
        if (payrollMonth.isAfter(today)) {
            return false;
        }

        // Kiểm tra có base salary
        if (user.getBaseSalary() == null || user.getBaseSalary().compareTo(BigDecimal.ZERO) <= 0) {
            return false;
        }

        return true;

    }

    @Override
    public PayrollCalculationDTO calTimeBasedPayroll(TbUser user, LocalDate payrollMonth, BigDecimal allowance) {
        if (user.getSalaryType() != TbUser.SalaryType.TimeBased) {
            throw new RuntimeException("User is not TimeBased salary type");
        }

        // Validate dữ liệu
        if (!validatePayrollData(user, payrollMonth)) {
            throw new RuntimeException("Invalid payroll data for calculation");
        }

        // Gọi calEmpSalary, nó sẽ tự động xử lý TimeBased
        return calEmpSalary(user, payrollMonth, allowance);
    }


    @Override
    public PayrollCalculationDTO calProductBasedPayroll(TbUser user, LocalDate payrollMonth, BigDecimal allowance) {
        // Kiểm tra loại lương
        if (user.getSalaryType() != TbUser.SalaryType.ProductBased) {
            throw new RuntimeException("User is not ProductBased salary type");
        }

        // Validate dữ liệu
        if (!validatePayrollData(user, payrollMonth)) {
            throw new RuntimeException("Invalid payroll data for calculation");
        }

        // Kiểm tra nhân viên có line (unit/team)
        if (user.getLine() == null) {
            throw new RuntimeException("ProductBased employee must have a line/unit assigned");
        }

        // Gọi calEmpSalary, nó sẽ tự động xử lý ProductBased
        return calEmpSalary(user, payrollMonth, allowance);
    }


    //tách OT thành giờ ngày thường và giờ ngày lễ/chủ nhật
    private HoursSplit splitOvertimeHours(TbUser user, YearMonth yearMonth) {
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
                .findByEmployeeAndStatusAndTicketDateBetween(
                        user,
                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
                        startDate,
                        endDate);

        BigDecimal weekdayHours = BigDecimal.ZERO;
        BigDecimal holidayHours = BigDecimal.ZERO;

        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
            if (overtimeRequest == null) {
                continue;
            }

            LocalTime startTime = overtimeRequest.getStartTime();
            LocalTime endTime = overtimeRequest.getEndTime();
            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);

            boolean holiday = holidayService.isSundayOrHoliday(overtimeRequest.getOvertimeDate());
            if (holiday) {
                holidayHours = holidayHours.add(hours);
            } else {
                weekdayHours = weekdayHours.add(hours);
            }
        }

        return new HoursSplit(weekdayHours, holidayHours);
    }

    private record HoursSplit(BigDecimal weekdayHours, BigDecimal holidayHours) {

    }
}
// package fpt.aptech.springbootapp.services.ModuleC_Payroll;
//
//import java.math.BigDecimal;
//import java.math.RoundingMode;
//import java.time.LocalDate;
//import java.time.LocalTime;
//import java.time.YearMonth;
//import java.time.temporal.ChronoUnit;
//import java.util.List;
//
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.context.annotation.Primary;
//import org.springframework.stereotype.Service;
//
//import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
//import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
//import fpt.aptech.springbootapp.entities.Core.TbUser;
//import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
//import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
//import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
//import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
//import fpt.aptech.springbootapp.entities.ModuleC.TbProductionLine;
//import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.AttendanceRepository;
//import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketEmployeeRepository;
//import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionLineRepo;
//import fpt.aptech.springbootapp.repositories.ModuleD_Leave.LeaveRequestRepo;
//import fpt.aptech.springbootapp.services.System.HolidayService;
//
//@Service
//@Primary
//public class PayrollCalculationServiceImp implements PayrollCalculationService {
//
//    private final AttendanceRepository attendsRepo;
//    private final OvertimeTicketEmployeeRepository otTERepo;
//    private final ProductionLineRepo prodLineRepo;
//    private final fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo employeeProductionRepo;
//    private final LeaveRequestRepo leaveRequestRepo;
//    private final HolidayService holidayService;
//    private final PersonalIncomeTaxCalService taxCalculationService;
//    private final EmployeeTaxProfileService taxProfileService;
//
//    private static final BigDecimal HOURS_PER_DAY = new BigDecimal("8");
//    private static final BigDecimal STANDARD_WORKING_DAYS = new BigDecimal("26");
//    private static final BigDecimal HOURS_PER_MONTH = new BigDecimal("176");  // 26 * 8
//    private static final BigDecimal LATE_PENALTY = new BigDecimal("50000");
//    private static final int SCALE = 2;
//
//    @Autowired
//    public PayrollCalculationServiceImp(
//            AttendanceRepository attendsRepo,
//            OvertimeTicketEmployeeRepository otTERepo,
//            ProductionLineRepo prodLineRepo,
//            fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo employeeProductionRepo,
//            HolidayService holidayService,
//            LeaveRequestRepo leaveRequestRepo,
//            PersonalIncomeTaxCalService taxCalculationService,
//            EmployeeTaxProfileService taxProfileService) {
//        this.attendsRepo = attendsRepo;
//        this.otTERepo = otTERepo;
//        this.prodLineRepo = prodLineRepo;
//        this.employeeProductionRepo = employeeProductionRepo;
//        this.holidayService = holidayService;
//        this.leaveRequestRepo = leaveRequestRepo;
//        this.taxCalculationService = taxCalculationService;
//        this.taxProfileService = taxProfileService;
//    }
//
//    //tinh luong full cho employee
//    @Override
//    public PayrollCalculationDTO calEmpSalary(TbUser user, LocalDate payrollMonth, BigDecimal allowance) {
//        PayrollCalculationDTO payDto = new PayrollCalculationDTO();
//        payDto.setUserId(user.getId());
//        payDto.setUserName(user.getFullName());
//        payDto.setSalaryType(user.getSalaryType().toString());
//        payDto.setBaseSalary(user.getBaseSalary());
//
//        //lấy hệ số lương theo từng nhân viên từ DB
//        payDto.setWageCoefficient(user.getWageCoefficient() != null ? user.getWageCoefficient() : new BigDecimal("1"));
//
//        YearMonth yearMonth = YearMonth.from(payrollMonth);
//
//        //1. luong Time
//        BigDecimal timeSalary = calTimeSalary(user, yearMonth, payDto);
//        payDto.setTimeSalary(timeSalary);
//
//        //2. luong ProductBonus
//        BigDecimal productBonus = calProductBonus(user, yearMonth, payDto);
//        payDto.setProductBonus(productBonus);
//
//        //3. luong OT
//        BigDecimal overtimePay = calOvertimePay(user, yearMonth, payDto);
//        payDto.setOvertimePay(overtimePay);
//
//        //lấy các giờ và weight. workingDays lấy từ actualWorkingDays đã tính trong calTimeSalary
//        payDto.setWorkingDays(payDto.getActualWorkingDays());
//
//        // Giờ thường  = workingDays * 8
//        BigDecimal regularHours = (payDto.getWorkingDays() != null)
//                ? payDto.getWorkingDays().multiply(HOURS_PER_DAY)
//                : BigDecimal.ZERO;
//        payDto.setRegularHours(regularHours);
//
//        // Tách OT ngày thường và OT ngày lễ/chủ nhật
//        HoursSplit split = splitOvertimeHours(user, yearMonth);
//        payDto.setOtWeekdayHours(split.weekdayHours);
//        payDto.setOtHolidayHours(split.holidayHours);
//
//        // weight = (regularHours + otWeekdayHours*1.5 + otHolidayHours*2.0) * wageCoefficient
//        BigDecimal weight = regularHours
//                .add(split.weekdayHours.multiply(new BigDecimal("1.5")))
//                .add(split.holidayHours.multiply(new BigDecimal("2.0")))
//                .multiply(payDto.getWageCoefficient());
//        payDto.setWeight(weight.setScale(SCALE, RoundingMode.HALF_UP));
//
//        //4. tinh khau tru
//        BigDecimal deductions = calDeductions(user, yearMonth, payDto);
//        payDto.setTotalDeduction(deductions);
//
//        //5. troj cap
//        payDto.setAllowance(allowance != null ? allowance : BigDecimal.ZERO);
//
//        // tinhs thue TNCN
//        BigDecimal grossIncomeBeforeTax;
//        if (user.getSalaryType() == TbUser.SalaryType.ProductBased) {
//            grossIncomeBeforeTax = user.getBaseSalary()
//                    .add(productBonus)
//                    .add(overtimePay)
//                    .add(allowance != null ? allowance : BigDecimal.ZERO);
//        } else {
//            grossIncomeBeforeTax = user.getBaseSalary()
//                    .add(overtimePay)
//                    .add(allowance != null ? allowance : BigDecimal.ZERO);
//        }
//
//        TaxCalculationDTO taxDTO = calPersonalIncomeTax(user, grossIncomeBeforeTax, payrollMonth);
//        payDto.setTaxCalculation(taxDTO);
//
//        //6 Total salary - lương ròng
//        BigDecimal totalPay;
//        if (user.getSalaryType() == TbUser.SalaryType.ProductBased) {
//            totalPay = user.getBaseSalary()
//                    .add(productBonus)
//                    .add(overtimePay)
//                    .add(allowance != null ? allowance : BigDecimal.ZERO)
//                    .subtract(deductions)
//                    .subtract(taxDTO.getTotalTax());
//            payDto.setCalculationNote(
//                    String.format("ProductBased: baseSalary(%.0f) + productBonus(%.0f) + overtimePay(%.0f) + allowance(%.0f) - deduction(%.0f) - tax(%.0f) = %.0f",
//                            user.getBaseSalary(), productBonus, overtimePay,
//                            allowance != null ? allowance : BigDecimal.ZERO,
//                            deductions, taxDTO.getTotalTax(), totalPay)
//            );
//
//        } else {
//            totalPay = user.getBaseSalary()
//                    .add(overtimePay)
//                    .add(allowance != null ? allowance : BigDecimal.ZERO)
//                    .subtract(deductions)
//                    .subtract(taxDTO.getTotalTax());
//
//            payDto.setCalculationNote(
//                    String.format("TimeBased: baseSalary(%.0f) + overtimePay(%.0f) + allowance(%.0f) - deduction(%.0f) - tax(%.0f) = %.0f",
//                            user.getBaseSalary(), overtimePay,
//                            allowance != null ? allowance : BigDecimal.ZERO,
//                            deductions, taxDTO.getTotalTax(), totalPay)
//            );
//
//        }
//        payDto.setTotalPay(totalPay.setScale(SCALE, RoundingMode.HALF_UP));
//
//        return payDto;
//    }
//
//    //tinh luong TimeBase:
//    // baseSalary /26 * actualWoorkingDays - (latePenalty * lateCount
//    @Override
//    public BigDecimal calTimeSalary(TbUser user, YearMonth yearMonth, PayrollCalculationDTO payDto) {
//        LocalDate startDate = yearMonth.atDay(1);
//        LocalDate endDate = yearMonth.atEndOfMonth();
//
//        // Đếm ngày muộn
//        List<TbAttendance> lateAttendances = attendsRepo
//                .findByUserAndDateBetweenAndStatus(user, startDate, endDate, TbAttendance.AttendanceStatus.LATE);
//
//        int lateCount = lateAttendances.size();
//        payDto.setLateCount(lateCount);
//
//        // Lấy ngày nghỉ có phép
//        List<TbLeaveRequest> approvedLeaves = leaveRequestRepo
//                .findByUserAndStatusAndStartDateBetween(
//                        user,
//                        TbLeaveRequest.LeaveStatus.approved.name(),
//                        startDate, endDate);
//
//        BigDecimal approvedLeaveDays = BigDecimal.ZERO;
//        for (TbLeaveRequest leave : approvedLeaves) {
//            long days = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
//            approvedLeaveDays = approvedLeaveDays.add(new BigDecimal(days));
//        }
//
//        payDto.setApprovedLeaveDays(approvedLeaveDays);
//        payDto.setLatePenalty(LATE_PENALTY);
//
//        // Tính lương thời gian
//        BigDecimal actualWorkingDays = STANDARD_WORKING_DAYS.subtract(approvedLeaveDays);
//        payDto.setActualWorkingDays(actualWorkingDays);
//
//        BigDecimal dailySalary = user.getBaseSalary().divide(STANDARD_WORKING_DAYS, SCALE, RoundingMode.HALF_UP);
//        BigDecimal timeSalary = dailySalary.multiply(actualWorkingDays)
//                .subtract(LATE_PENALTY.multiply(new BigDecimal(lateCount)));
//
//        return timeSalary.setScale(SCALE, RoundingMode.HALF_UP);
//    }
//
//    //tinh luong ProductBase
//    // Dùng bảng tbEmployeeProduction nếu có nhập; fallback sang tbProductionLine (subline) nếu chưa nhập
//    // A = productCount * unitPrice
//    // C = 26 * 8 + overtimeHours
//    // productBonus = (A / C) * (26*8)
//    @Override
//    public BigDecimal calProductBonus(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
//        if (user.getSalaryType() != TbUser.SalaryType.ProductBased || user.getLine() == null) {
//            return BigDecimal.ZERO;
//        }
//        LocalDate monthDate = yearMonth.atDay(1);
//
//        // 1) Prefer employee-specific production if exists
//        var empProds = employeeProductionRepo.findByEmployeeAndMonth(user.getId(), monthDate);
//        if (!empProds.isEmpty()) {
//            BigDecimal total = BigDecimal.ZERO;
//            BigDecimal totalOt = getTotalOvertimeHours(user, yearMonth);
//            BigDecimal C = HOURS_PER_MONTH.add(totalOt);
//
//            for (var ep : empProds) {
//                BigDecimal A = new BigDecimal(ep.getProductCount())
//                        .multiply(ep.getUnitPrice() != null ? ep.getUnitPrice() : ep.getProduction().getUnitPrice());
//                BigDecimal productSalaryPerHour = A.divide(C, SCALE, RoundingMode.HALF_UP);
//                BigDecimal bonus = productSalaryPerHour.multiply(HOURS_PER_MONTH);
//                total = total.add(bonus);
//
//                dto.setProductCount(ep.getProductCount());
//                dto.setUnitPrice(ep.getUnitPrice() != null ? ep.getUnitPrice() : ep.getProduction().getUnitPrice());
//                dto.setTotalWorkingHours(C.longValue());
//                dto.setProductSalaryPerHour(productSalaryPerHour);
//            }
//
//            return total.setScale(SCALE, RoundingMode.HALF_UP);
//        }
//
//        // 2) Fallback to subline-based allocation if no employee-specific input
//        List<TbProductionLine> productionLines = prodLineRepo
//                .findByMonthAndSubline(monthDate, user.getLine().getId());
//        if (productionLines.isEmpty()) {
//            return BigDecimal.ZERO;
//        }
//
//        BigDecimal totalProductBonus = BigDecimal.ZERO;
//        BigDecimal totalOvertimeHours = getTotalOvertimeHours(user, yearMonth);
//        for (TbProductionLine pl : productionLines) {
//            BigDecimal A = new BigDecimal(pl.getProduction().getProductCount())
//                    .multiply(pl.getProduction().getUnitPrice());
//            BigDecimal B = A.multiply(new BigDecimal(pl.getCountContribution()));
//            BigDecimal C = HOURS_PER_MONTH.add(totalOvertimeHours);
//            BigDecimal productSalaryPerHour = B.divide(C, SCALE, RoundingMode.HALF_UP);
//            BigDecimal bonus = productSalaryPerHour.multiply(HOURS_PER_MONTH);
//            totalProductBonus = totalProductBonus.add(bonus);
//
//            dto.setProductCount(pl.getProduction().getProductCount());
//            dto.setUnitPrice(pl.getProduction().getUnitPrice());
//            dto.setCountContribution(pl.getCountContribution());
//            dto.setTotalWorkingHours(pl.getTotalWorkingHours());
//            dto.setProductSalaryPerHour(productSalaryPerHour);
//        }
//        return totalProductBonus.setScale(SCALE, RoundingMode.HALF_UP);
//    }
//
//    //tinh luong OT
//    //overtimePay = overtimeHours × (baseSalary / 176) × multiplier
//    @Override
//    public BigDecimal calOvertimePay(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
//        BigDecimal totalOvertimeHours = getTotalOvertimeHours(user, yearMonth);
//        dto.setOvertimeHours(totalOvertimeHours);
//
//        if (totalOvertimeHours.compareTo(BigDecimal.ZERO) <= 0) {
//            return BigDecimal.ZERO;
//        }
//
//        BigDecimal averageMultiplier = getAvgOvertimeMultiplier(user, yearMonth);
//        dto.setOvertimeMultiplier(averageMultiplier);
//
//        BigDecimal hourlyRate = user.getBaseSalary().divide(HOURS_PER_MONTH, SCALE, RoundingMode.HALF_UP);
//        BigDecimal overtimePay = totalOvertimeHours
//                .multiply(hourlyRate)
//                .multiply(averageMultiplier);
//
//        return overtimePay.setScale(SCALE, RoundingMode.HALF_UP);
//    }
//
//    //tinh Deduction
//    @Override
//    public BigDecimal calDeductions(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
//        BigDecimal totalDeduction = BigDecimal.ZERO;
//
//        //Bao Hiem 10.5% bao gồm bảo hiểm xã hội + bảo hiểm y tế + bảo hiểm thất nghiêp
//        BigDecimal insurance = user.getBaseSalary()
//                .multiply(new BigDecimal("10.5"))
//                .setScale(SCALE, RoundingMode.HALF_UP);
//        totalDeduction = totalDeduction.add(insurance);
//
//        //phat late
//        BigDecimal latePenalty = LATE_PENALTY.multiply(new BigDecimal(dto.getLateCount()));
//        totalDeduction = totalDeduction.add(latePenalty);
//
//        return totalDeduction.setScale(SCALE, RoundingMode.HALF_UP);
//    }
//
//    //tinh thue tncn
//    @Override
//    public TaxCalculationDTO calPersonalIncomeTax(
//            TbUser user,
//            BigDecimal grossIncome,
//            LocalDate payrollMonth) {
//        return taxCalculationService.calculatePersonalIncomeTax(user, grossIncome, payrollMonth);
//    }
//
//    //lay tong gio tang ca trong thang
//    @Override
//    public BigDecimal getTotalOvertimeHours(TbUser user, YearMonth yearMonth) {
//        LocalDate startDate = yearMonth.atDay(1);
//        LocalDate endDate = yearMonth.atEndOfMonth();
//
//        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
//                .findByEmployeeAndStatusAndTicketDateBetween(
//                        user,
//                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
//                        startDate,
//                        endDate);
//
//        BigDecimal totalHours = BigDecimal.ZERO;
//        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
//            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
//            if (overtimeRequest == null) {
//                continue;
//            }
//
//            LocalTime startTime = overtimeRequest.getStartTime();
//            LocalTime endTime = overtimeRequest.getEndTime();
//            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
//            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);
//            totalHours = totalHours.add(hours);
//        }
//
//        return totalHours;
//    }
//
//    //tinh multiplier OT trung binh trong thang
//    @Override
//    public BigDecimal getAvgOvertimeMultiplier(TbUser user, YearMonth yearMonth) {
//        LocalDate startDate = yearMonth.atDay(1);
//        LocalDate endDate = yearMonth.atEndOfMonth();
//
//        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
//                .findByEmployeeAndStatusAndTicketDateBetween(
//                        user,
//                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
//                        startDate,
//                        endDate);
//
//        BigDecimal totalMultiplier = BigDecimal.ZERO;
//        BigDecimal totalHours = BigDecimal.ZERO;
//
//        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
//            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
//            if (overtimeRequest == null) {
//                continue;
//            }
//
//            LocalTime startTime = overtimeRequest.getStartTime();
//            LocalTime endTime = overtimeRequest.getEndTime();
//            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
//            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);
//
//            BigDecimal multiplier = holidayService.getOvertimeMultiplier(overtimeRequest.getOvertimeDate());
//            totalMultiplier = totalMultiplier.add(multiplier.multiply(hours));
//            totalHours = totalHours.add(hours);
//        }
//
//        if (totalHours.compareTo(BigDecimal.ZERO) <= 0) {
//            return new BigDecimal("1.5");
//        }
//
//        return totalMultiplier.divide(totalHours, SCALE, RoundingMode.HALF_UP);
//    }
//
//    //tách OT thành giờ ngày thường và giờ ngày lễ/chủ nhật
//    private HoursSplit splitOvertimeHours(TbUser user, YearMonth yearMonth) {
//        LocalDate startDate = yearMonth.atDay(1);
//        LocalDate endDate = yearMonth.atEndOfMonth();
//
//        List<TbOvertimeTicketEmployee> overtimeEmployees = otTERepo
//                .findByEmployeeAndStatusAndTicketDateBetween(
//                        user,
//                        TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted,
//                        startDate,
//                        endDate);
//
//        BigDecimal weekdayHours = BigDecimal.ZERO;
//        BigDecimal holidayHours = BigDecimal.ZERO;
//
//        for (TbOvertimeTicketEmployee ote : overtimeEmployees) {
//            TbOvertimeRequest overtimeRequest = ote.getOvertimeTicket().getOvertimeRequest();
//            if (overtimeRequest == null) {
//                continue;
//            }
//
//            LocalTime startTime = overtimeRequest.getStartTime();
//            LocalTime endTime = overtimeRequest.getEndTime();
//            long minutes = ChronoUnit.MINUTES.between(startTime, endTime);
//            BigDecimal hours = new BigDecimal(minutes).divide(new BigDecimal("60"), SCALE, RoundingMode.HALF_UP);
//
//            boolean holiday = holidayService.isSundayOrHoliday(overtimeRequest.getOvertimeDate());
//            if (holiday) {
//                holidayHours = holidayHours.add(hours);
//            } else {
//                weekdayHours = weekdayHours.add(hours);
//            }
//        }
//
//        return new HoursSplit(weekdayHours, holidayHours);
//    }
//
//    private record HoursSplit(BigDecimal weekdayHours, BigDecimal holidayHours) {
//
//    }
//}
