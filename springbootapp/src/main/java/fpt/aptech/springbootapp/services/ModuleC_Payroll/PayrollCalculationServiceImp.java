package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import fpt.aptech.springbootapp.dtos.ModuleC.*;
import fpt.aptech.springbootapp.entities.Core.*;
import fpt.aptech.springbootapp.entities.ModuleA.*;
import fpt.aptech.springbootapp.entities.ModuleB.*;
import fpt.aptech.springbootapp.entities.ModuleC.*;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.*;
import fpt.aptech.springbootapp.repositories.ModuleB.*;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.*;
import fpt.aptech.springbootapp.repositories.ModuleD_Leave.*;
import fpt.aptech.springbootapp.services.System.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.*;
import java.time.*;
import java.time.*;
import java.util.*;
import java.time.temporal.ChronoUnit;

@Service
public class PayrollCalculationServiceImp implements  PayrollCalculationService{

    private final AttendanceRepository attendsRepo;
    private final OvertimeTicketEmployeeRepository otTERepo;
    private final ProductionLineRepo prodLineRepo;
    private final LeaveRequestRepo leaveRequestRepo;
    private final HolidayService holidayService;
    private final PersonalIncomeTaxCalService taxCalculationService;
    private final EmployeeTaxProfileService taxProfileService;

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
            HolidayService holidayService,
            LeaveRequestRepo leaveRequestRepo,
            PersonalIncomeTaxCalService taxCalculationService,
            EmployeeTaxProfileService taxProfileService) {
        this.attendsRepo = attendsRepo;
        this.otTERepo = otTERepo;
        this.prodLineRepo = prodLineRepo;
        this.holidayService = holidayService;
        this.leaveRequestRepo = leaveRequestRepo;
        this.taxCalculationService = taxCalculationService;
        this.taxProfileService = taxProfileService;
    }

    //tinh luong full cho employee
    @Override
    public PayrollCalculationDTO calEmpSalary(TbUser user, LocalDate payrollMonth, BigDecimal allowance) {
        PayrollCalculationDTO payDto = new PayrollCalculationDTO();
        payDto.setUserId(user.getId());
        payDto.setUserName(user.getFullName());
        payDto.setSalaryType(user.getSalaryType().toString());
        payDto.setBaseSalary(user.getBaseSalary());

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

        //4. tinh khau tru
        BigDecimal deductions = calDeductions(user, yearMonth, payDto);
        payDto.setTotalDeduction(deductions);

        //5. troj cap
        payDto.setAllowance(allowance != null ? allowance : BigDecimal.ZERO);

        // tinhs thue TNCN
        BigDecimal grossIncomeBeforeTax;
        if (user.getSalaryType() == TbUser.SalaryType.ProductBased) {
            grossIncomeBeforeTax = user.getBaseSalary()
                    .add(productBonus)
                    .add(overtimePay)
                    .add(allowance != null ? allowance : BigDecimal.ZERO);
        } else {
            grossIncomeBeforeTax = user.getBaseSalary()
                    .add(overtimePay)
                    .add(allowance != null ? allowance : BigDecimal.ZERO);
        }

        TaxCalculationDTO taxDTO = calPersonalIncomeTax(user, grossIncomeBeforeTax, payrollMonth);
        payDto.setTaxCalculation(taxDTO);

        //6 Total salary - lương ròng
        BigDecimal totalPay;
        if (user.getSalaryType() == TbUser.SalaryType.ProductBased) {
            totalPay = user.getBaseSalary()
                    .add(productBonus)
                    .add(overtimePay)
                    .add(allowance != null ? allowance : BigDecimal.ZERO)
                    .subtract(deductions)
                    .subtract(taxDTO.getTotalTax());
            payDto.setCalculationNote(
                    String.format("ProductBased: baseSalary(%.0f) + productBonus(%.0f) + overtimePay(%.0f) + allowance(%.0f) - deduction(%.0f) - tax(%.0f) = %.0f",
                            user.getBaseSalary(), productBonus, overtimePay,
                            allowance != null ? allowance : BigDecimal.ZERO,
                            deductions, taxDTO.getTotalTax(), totalPay)
            );

        } else {
            totalPay = user.getBaseSalary()
                    .add(overtimePay)
                    .add(allowance != null ? allowance : BigDecimal.ZERO)
                    .subtract(deductions)
                    .subtract(taxDTO.getTotalTax());

            payDto.setCalculationNote(
                    String.format("TimeBased: baseSalary(%.0f) + overtimePay(%.0f) + allowance(%.0f) - deduction(%.0f) - tax(%.0f) = %.0f",
                            user.getBaseSalary(), overtimePay,
                            allowance != null ? allowance : BigDecimal.ZERO,
                            deductions, taxDTO.getTotalTax(), totalPay)
            );

        }
            payDto.setTotalPay(totalPay.setScale(SCALE, RoundingMode.HALF_UP));

            return payDto;
        }


    //tinh luong TimeBase:
    // baseSalary /26 * actualWoorkingDays - (latePenalty * lateCount
        @Override
        public BigDecimal calTimeSalary(TbUser user, YearMonth yearMonth, PayrollCalculationDTO payDto) {
            LocalDate startDate = yearMonth.atDay(1);
            LocalDate endDate = yearMonth.atEndOfMonth();

            // Đếm ngày muộn
            List<TbAttendance> lateAttendances = attendsRepo
                    .findByUserAndDateBetweenAndStatus(user, startDate, endDate, TbAttendance.AttendanceStatus.LATE);

            int lateCount = lateAttendances.size();
            payDto.setLateCount(lateCount);

            // Lấy ngày nghỉ có phép
            List<TbLeaveRequest> approvedLeaves = leaveRequestRepo
                    .findByUserAndStatusAndStartDateBetween(
                            user,
                            TbLeaveRequest.LeaveStatus.approved.name(),
                            startDate, endDate);

            BigDecimal approvedLeaveDays = BigDecimal.ZERO;
            for (TbLeaveRequest leave : approvedLeaves) {
                long days = ChronoUnit.DAYS.between(leave.getStartDate(), leave.getEndDate()) + 1;
                approvedLeaveDays = approvedLeaveDays.add(new BigDecimal(days));
            }

            payDto.setApprovedLeaveDays(approvedLeaveDays);
            payDto.setLatePenalty(LATE_PENALTY);

            // Tính lương thời gian
            BigDecimal actualWorkingDays = STANDARD_WORKING_DAYS.subtract(approvedLeaveDays);
            payDto.setActualWorkingDays(actualWorkingDays);

            BigDecimal dailySalary = user.getBaseSalary().divide(STANDARD_WORKING_DAYS, SCALE, RoundingMode.HALF_UP);
            BigDecimal timeSalary = dailySalary.multiply(actualWorkingDays)
                    .subtract(LATE_PENALTY.multiply(new BigDecimal(lateCount)));

            return timeSalary.setScale(SCALE, RoundingMode.HALF_UP);
        }


        //tinh luong ProductBase
    // A = productCount * unitPrice 
    // B= A * countContribution:
    // C = 26 * 8 + overtimeHours
    //productBonus = A / C * (26*8)
        @Override
        public BigDecimal calProductBonus(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
            if (user.getSalaryType() != TbUser.SalaryType.ProductBased || user.getLine() == null) {
                return BigDecimal.ZERO;
            }

            LocalDate monthDate = yearMonth.atDay(1);
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
                dto.setTotalWorkingHours(pl.getTotalWorkingHours());
                dto.setProductSalaryPerHour(productSalaryPerHour);
            }

            return totalProductBonus.setScale(SCALE, RoundingMode.HALF_UP);
        }

    //tinh luong OT
    //overtimePay = overtimeHours × (baseSalary / 176) × multiplier
    @Override
    public BigDecimal calOvertimePay(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto) {
        BigDecimal totalOvertimeHours = getTotalOvertimeHours(user, yearMonth);
        dto.setOvertimeHours(totalOvertimeHours);

        if (totalOvertimeHours.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal averageMultiplier = getAvgOvertimeMultiplier(user, yearMonth);
        dto.setOvertimeMultiplier(averageMultiplier);

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
                .setScale(SCALE, RoundingMode.HALF_UP);
        totalDeduction = totalDeduction.add(insurance);

        //phat late
        BigDecimal latePenalty = LATE_PENALTY.multiply(new BigDecimal(dto.getLateCount()));
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
            if (overtimeRequest == null) continue;

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
            if (overtimeRequest == null) continue;

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
}
