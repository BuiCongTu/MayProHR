package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollResponseDTO;
import fpt.aptech.springbootapp.dtos.response.TbEmployeePayrollDTO;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.PayrollRepo;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TimeBaseAllocDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TimeBaseAllocationResult;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeProduction;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeWorkTime;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayroll;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeePayrollRepo;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeWorkTimeRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PayrollServiceImp implements PayrollService {

    private EmployeePayrollRepo employeePayrollRepo;
    private final PayrollRepo payrollRepo;
    private final EmployeeProductionRepo employeeProductionRepo;

    private UserRepository userRepository;
    private final EmployeeWorkTimeRepository ewtrepo;
    private final PayrollCalculationService payrollCalService;

    @Autowired
    public PayrollServiceImp(EmployeePayrollRepo employeePayrollRepo,
            UserRepository userRepository,
            EmployeeWorkTimeRepository ewtrepo,
            PayrollCalculationService payrollCalService,
                             PayrollRepo payrollRepo,
                             EmployeeProductionRepo employeeProductionRepo) {
        this.employeePayrollRepo = employeePayrollRepo;
        this.userRepository = userRepository;
        this.ewtrepo = ewtrepo;
        this.payrollCalService = payrollCalService;
        this.payrollRepo = payrollRepo;
        this.employeeProductionRepo = employeeProductionRepo;
    }

    @Override
    public TbEmployeePayroll getEmpPayrollByYearMonth(Integer userId, Integer year, Integer month) {
        Optional<TbUser> user = userRepository.findById(userId);
        if (!user.isPresent()) {
            throw new RuntimeException("Not found employee: " + userId);
        }

        Optional<TbEmployeePayroll> payroll = employeePayrollRepo.findByUserIdAndYearAndMonth(userId, year, month);

        if (!payroll.isPresent()) {
            throw new RuntimeException("Not found payroll for employee: " + userId);
        }
        return payroll.get();
    }

    @Override
    public List<TbEmployeePayroll> getEmpPayrollByYear(Integer userId, Integer year) {
        Optional<TbUser> user = userRepository.findById(userId);
        if (!user.isPresent()) {
        }
        List<TbEmployeePayroll> payrolls = employeePayrollRepo.findByUserIdAndYear(userId, year);

        return payrolls;

    }

    @Override
    public List<TbEmployeePayroll> getEmpPayrollHistory(Integer userId) {
        Optional<TbUser> user = userRepository.findById(userId);
        if (!user.isPresent()) {
            throw new RuntimeException("Not found employee: " + userId);
        }
        List<TbEmployeePayroll> payrolls = employeePayrollRepo.findByUserId(userId);

        return payrolls;
    }

    @Override
    public List<Integer> getAvailableYears(Integer userId) {

        Optional<TbUser> user = userRepository.findById(userId);
        if (!user.isPresent()) {
            throw new RuntimeException("Not found employee: " + userId);
        }
        List<TbEmployeePayroll> payrolls = employeePayrollRepo.findByUserId(userId);
        List<Integer> years = new ArrayList<>();
        for (TbEmployeePayroll payroll : payrolls) {
            int year = payroll.getPayroll().getMonth().getYear();
            boolean found = false;
            for (Integer y : years) {
                if (y == year) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                years.add(year);
            }
        }

        for (int i = 0; i < years.size(); i++) {
            for (int j = i + 1; j < years.size(); j++) {
                if (years.get(i) < years.get(j)) {
                    // Swap
                    int temp = years.get(i);
                    years.set(i, years.get(j));
                    years.set(j, temp);
                }
            }
        }

        return years;
    }

    @Override
    public List<Integer> getAvailableMonths(Integer userId, Integer year) {
        Optional<TbUser> user = userRepository.findById(userId);
        if (!user.isPresent()) {
            throw new RuntimeException("Not found employee: " + userId);
        }
        List<TbEmployeePayroll> payrolls = employeePayrollRepo.findByUserIdAndYear(userId, year);
        List<Integer> months = new ArrayList<>();
        for (TbEmployeePayroll payroll : payrolls) {
            int month = payroll.getPayroll().getMonth().getMonthValue();
            boolean found = false;
            for (Integer m : months) {
                if (m == month) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                months.add(month);
            }
        }
        for (int i = 0; i < months.size(); i++) {
            for (int j = i + 1; j < months.size(); j++) {
                if (months.get(i) > months.get(j)) {
                    // Swap
                    int temp = months.get(i);
                    months.set(i, months.get(j));
                    months.set(j, temp);
                }
            }
        }
        return months;
    }

    // tạo và lưu WorkTime cho từng EmployeePayroll trong một Payroll
    @Override
    public void generateAndSaveWorkTimeForPayroll(TbPayroll payroll, LocalDate payrollMonth) {
        if (payroll == null || payroll.getEmployeePayrolls() == null || payroll.getEmployeePayrolls().isEmpty()) {
            return;
        }

        for (TbEmployeePayroll epSaved : payroll.getEmployeePayrolls()) {
            TbUser u = epSaved.getUser();
            BigDecimal allowance = epSaved.getAllowance() != null ? epSaved.getAllowance() : BigDecimal.ZERO;
            PayrollCalculationDTO calc = payrollCalService.calEmpSalary(u, payrollMonth, allowance);

            TbEmployeeWorkTime wt = new TbEmployeeWorkTime();
            wt.setEmployeePayroll(epSaved);
            wt.setWorkingDays(calc.getWorkingDays());
            wt.setRegularHours(calc.getRegularHours());
            wt.setOtWeekdayHours(calc.getOtWeekdayHours());
            wt.setOtHolidayHours(calc.getOtHolidayHours());
            wt.setWeight(calc.getWeight());
            wt.setCreatedAt(Instant.now());
            ewtrepo.save(wt);
        }
    }

    //lấy WorkTime theo employeePayrollId
    @Override
    public TbEmployeeWorkTime getEmployeeWorkTimeByEmployeePayrollId(Integer employeePayrollId) {
        return ewtrepo.findByEmployeePayroll_Id(employeePayrollId);
    }

    // Branch D: Allocate time-base fund for a set of employees (work unit)
    @Override
    public TimeBaseAllocationResult allocateTimeBaseFund(Integer year, Integer month, BigDecimal fundAmount, List<Integer> employeeIds) {
        if (year == null || month == null || fundAmount == null || fundAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Invalid input for allocation");
        }
        if (employeeIds == null || employeeIds.isEmpty()) {
            throw new IllegalArgumentException("employeeIds is required");
        }

        LocalDate payrollMonth = LocalDate.of(year, month, 1);

        List<TimeBaseAllocDTO> items = new ArrayList<>();
        BigDecimal totalWeight = BigDecimal.ZERO;

        // First pass: compute hours, weights per employee
        for (Integer userId : employeeIds) {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Not found employee: " + userId));

            BigDecimal allowance = BigDecimal.ZERO;
            PayrollCalculationDTO calc = payrollCalService.calEmpSalary(user, payrollMonth, allowance);

            BigDecimal hours = BigDecimal.ZERO;
            if (calc.getRegularHours() != null) {
                hours = hours.add(calc.getRegularHours());
            }
            if (calc.getOtWeekdayHours() != null) {
                hours = hours.add(calc.getOtWeekdayHours());
            }
            if (calc.getOtHolidayHours() != null) {
                hours = hours.add(calc.getOtHolidayHours());
            }

            BigDecimal coef = user.getWageCoefficient() != null ? user.getWageCoefficient() : BigDecimal.ONE;
            BigDecimal weight = coef.multiply(hours);

            items.add(TimeBaseAllocDTO.builder()
                    .userId(userId)
                    .skillCoefficient(coef)
                    .hours(hours)
                    .weight(weight)
                    .allocatedSalary(BigDecimal.ZERO)
                    .build());

            totalWeight = totalWeight.add(weight);
        }

        // Second pass: compute allocation and persist on existing EmployeePayroll rows
        for (TimeBaseAllocDTO item : items) {
            BigDecimal allocated = BigDecimal.ZERO;
            if (totalWeight.compareTo(BigDecimal.ZERO) > 0) {
                allocated = fundAmount.multiply(item.getWeight())
                        .divide(totalWeight, 2, RoundingMode.HALF_UP);
            }
            item.setAllocatedSalary(allocated);

            // Persist into TbEmployeePayroll if it exists for that month; otherwise skip creation here
            Optional<TbEmployeePayroll> epOpt = employeePayrollRepo.findByUserIdAndYearAndMonth(item.getUserId(), year, month);
            if (epOpt.isPresent()) {
                TbEmployeePayroll ep = epOpt.get();
                ep.setTimeBaseHours(item.getHours());
                ep.setTimeBaseWeight(item.getWeight());
                ep.setTimeBaseAllocatedSalary(allocated);
                employeePayrollRepo.save(ep);
            }
        }

        return TimeBaseAllocationResult.builder()
                .year(year)
                .month(month)
                .fundAmount(fundAmount)
                .totalWeight(totalWeight)
                .items(items)
                .build();
    }

    @Override
    public TimeBaseAllocDTO getTimeBaseAllocationForEmployee(Integer userId, Integer year, Integer month) {
        Optional<TbEmployeePayroll> epOpt = employeePayrollRepo.findByUserIdAndYearAndMonth(userId, year, month);
        if (epOpt.isEmpty()) {
            return null;
        }
        TbEmployeePayroll ep = epOpt.get();

        BigDecimal coef = ep.getUser() != null && ep.getUser().getWageCoefficient() != null
                ? ep.getUser().getWageCoefficient() : BigDecimal.ONE;

        return TimeBaseAllocDTO.builder()
                .userId(userId)
                .skillCoefficient(coef)
                .hours(ep.getTimeBaseHours())
                .weight(ep.getTimeBaseWeight())
                .allocatedSalary(ep.getTimeBaseAllocatedSalary())
                .build();
    }

    @Override
    public void clearTimeBaseAllocation(Integer year, Integer month, List<Integer> employeeIds) {
        if (year == null || month == null || employeeIds == null || employeeIds.isEmpty()) {
            return;
        }
        for (Integer userId : employeeIds) {
            employeePayrollRepo.findByUserIdAndYearAndMonth(userId, year, month).ifPresent(ep -> {
                ep.setTimeBaseHours(null);
                ep.setTimeBaseWeight(null);
                ep.setTimeBaseAllocatedSalary(null);
                employeePayrollRepo.save(ep);
            });
        }
    }

    @Override
    public PayrollResponseDTO getPayrollDetail(Integer payrollId) {
        TbPayroll payroll = payrollRepo.findById(payrollId)
                .orElseThrow(() -> new EntityNotFoundException("Payroll not found: " + payrollId));

        PayrollResponseDTO dto = new PayrollResponseDTO();
        dto.setPayrollId(payroll.getId());
        dto.setDepartmentId(payroll.getDepartment() != null ? payroll.getDepartment().getId() : null);
        dto.setDepartmentName(
                payroll.getDepartment() != null ? payroll.getDepartment().getName() : null
        );
        dto.setMonth(payroll.getMonth());
        dto.setTotalSalary(payroll.getTotalSalary());
        dto.setStatus(payroll.getStatus() != null ? payroll.getStatus().name() : null);
        dto.setCreatedAt(payroll.getCreatedAt());

        // 1. Lấy danh sách employee payroll
        List<TbEmployeePayroll> eps = employeePayrollRepo.findByPayrollId(payrollId);

        // 2. Lấy danh sách WorkTime cho payroll và build HashMap<employeePayrollId, TbEmployeeWorkTime>
        List<TbEmployeeWorkTime> workTimes = ewtrepo.findByPayrollId(payrollId);
        Map<Integer, TbEmployeeWorkTime> workTimeMap = new HashMap<>();
        for (TbEmployeeWorkTime wt : workTimes) {
            if (wt.getEmployeePayroll() != null && wt.getEmployeePayroll().getId() != null) {
                workTimeMap.put(wt.getEmployeePayroll().getId(), wt);
            }
        }

        // 3. Lấy danh sách EmployeeProduction cho department + month,
        //    build HashMap<userId, totalProductCount>
        Map<Integer, BigDecimal> productionQtyMap = new HashMap<>();
        if (payroll.getDepartment() != null && payroll.getMonth() != null) {
            List<TbEmployeeProduction> prodList = employeeProductionRepo.findByDepartmentAndMonth(
                    payroll.getDepartment().getId(),
                    payroll.getMonth()
            );

            for (TbEmployeeProduction epProd : prodList) {
                if (epProd.getEmployee() == null || epProd.getEmployee().getId() == null) {
                    continue;
                }
                Integer userId = epProd.getEmployee().getId();
                BigDecimal current = productionQtyMap.getOrDefault(userId, BigDecimal.ZERO);
                BigDecimal qty = epProd.getProductCount() != null
                        ? BigDecimal.valueOf(epProd.getProductCount())
                        : BigDecimal.ZERO;
                productionQtyMap.put(userId, current.add(qty));
            }
        }

        // 4. Map sang DTO, sử dụng HashMap để lấy WorkTime và Production
        List<TbEmployeePayrollDTO> employeeDTOs = eps.stream()
                .map(ep -> mapToEmployeePayrollDTO(ep, workTimeMap, productionQtyMap))
                .collect(Collectors.toList());

        dto.setEmployeePayrolls(employeeDTOs);

        return dto;
    }

    private TbEmployeePayrollDTO mapToEmployeePayrollDTO(
            TbEmployeePayroll ep,
            Map<Integer, TbEmployeeWorkTime> workTimeMap,
            Map<Integer, BigDecimal> productionQtyMap
    ) {
        TbEmployeePayrollDTO dto = new TbEmployeePayrollDTO();
        dto.setEmployeePayrollId(ep.getId());

        if (ep.getUser() != null) {
            dto.setUserId(ep.getUser().getId());
            dto.setEmployeeCode(ep.getUser().getId());
            dto.setFullName(ep.getUser().getFullName());
        }

        dto.setBaseSalary(ep.getBaseSalary());
        dto.setAllowance(ep.getAllowance());
        dto.setProductBonus(ep.getProductBonus());
        dto.setOvertimePay(ep.getOvertimePay());
        dto.setDeduction(ep.getDeduction());
        dto.setPersonalIncomeTax(ep.getPersonalIncomeTax());
        dto.setTaxDeductionTotal(ep.getTaxDeductionTotal());
        dto.setTotalPay(ep.getTotalPay());

        // Lấy WorkTime từ HashMap thay vì ep.getWorkTime()
        TbEmployeeWorkTime wt = workTimeMap.get(ep.getId());
        if (wt != null) {
            dto.setTotalWorkDays(wt.getWorkingDays());
            // Tổng OT = otWeekday + otHoliday
            BigDecimal otTotal = BigDecimal.ZERO;
            if (wt.getOtWeekdayHours() != null) {
                otTotal = otTotal.add(wt.getOtWeekdayHours());
            }
            if (wt.getOtHolidayHours() != null) {
                otTotal = otTotal.add(wt.getOtHolidayHours());
            }
            dto.setTotalOvertimeHours(otTotal);
        }

        // Lấy tổng sản lượng theo userId từ HashMap
        if (ep.getUser() != null && ep.getUser().getId() != null) {
            BigDecimal qty = productionQtyMap.get(ep.getUser().getId());
            dto.setTotalProductionQuantity(qty != null ? qty : BigDecimal.ZERO);
        }

        dto.setNote(ep.getNote());
        dto.setCreatedAt(ep.getCreatedAt());
        return dto;
    }

}
