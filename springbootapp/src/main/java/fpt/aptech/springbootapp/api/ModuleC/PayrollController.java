package fpt.aptech.springbootapp.api.ModuleC;

import fpt.aptech.springbootapp.dtos.ModuleC.*;
import fpt.aptech.springbootapp.entities.Core.*;
import fpt.aptech.springbootapp.entities.ModuleC.*;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.*;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.ModuleC_Payroll.*;
import lombok.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance.AllowanceScope;


import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payroll")
//@CrossOrigin(origins = "*")
public class PayrollController {
    private final DepartmentRepository departmentRepository;
    private PayrollService payrollService;
    private final PayrollCalculationService payrollCalculationService;
    private final EmployeeTaxProfileService taxProfileService;
    private final PersonalIncomeTaxCalService taxCalculationService;
    private final UserRepository userRepository;
    private final EmployeePayrollRepo employeePayrollRepo;
    private final PayrollRepo payrollRepo;
    private final PayrollAllowanceRepo payrollAllowanceRepo;

    @Autowired
    public PayrollController(PayrollService payrollService,
                             PayrollCalculationService payrollCalculationService,
                             EmployeeTaxProfileService taxProfileService,
                             PersonalIncomeTaxCalService taxCalculationService,
                             UserRepository userRepository,
                             EmployeePayrollRepo employeePayrollRepo,
                             PayrollRepo payrollRepo,
                             DepartmentRepository departmentRepository,
                             PayrollAllowanceRepo payrollAllowanceRepo) {
        this.payrollService = payrollService;
        this.payrollCalculationService = payrollCalculationService;
        this.taxProfileService = taxProfileService;
        this.taxCalculationService = taxCalculationService;
        this.userRepository = userRepository;
        this.employeePayrollRepo = employeePayrollRepo;
        this.payrollRepo = payrollRepo;
        this.departmentRepository = departmentRepository;
        this.payrollAllowanceRepo = payrollAllowanceRepo;
    }

    // lay bang luong theo thang cu the
    @GetMapping("/employee/{userId}")
//    @PreAuthorize("hasAnyRole('WORKER', 'LEADER', 'MANAGER', 'FACTORY_MANAGER', 'FACTORY_DIRECTOR', 'HR', 'ADMIN')")
    public ResponseEntity<?> getEmployeePayrollByYearMonth(
            @PathVariable Integer userId,
            @RequestParam Integer year,
            @RequestParam Integer month) {
        try {
            if (userId == null || year == null || month == null) {
                return ResponseEntity.badRequest().body(buildErrorResponse("Missing required parameters(userId, year, month)"));
            }

            if (month < 1 || month > 12) {
                return ResponseEntity.badRequest().body(buildErrorResponse("Invalid month"));
            }
            TbEmployeePayroll payroll = payrollService.getEmpPayrollByYearMonth(userId, year, month);

            return ResponseEntity.ok(payroll);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(buildErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(buildErrorResponse("Server Error: " + e.getMessage()));
        }
    }

    //lay ds luong theo nam
    @GetMapping("/employee/{userId}/year")
//    @PreAuthorize("hasAnyRole('WORKER', 'LEADER', 'MANAGER', 'FACTORY_MANAGER', 'FACTORY_DIRECTOR', 'HR', 'ADMIN')")
    public ResponseEntity<?> getAvailableYears(@PathVariable Integer userId, @RequestParam Integer year) {
        try {
            List<TbEmployeePayroll> payrolls = payrollService.getEmpPayrollByYear(userId, year);
            return ResponseEntity.ok(payrolls);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(buildErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(buildErrorResponse("Server Error: " + e.getMessage()));
        }
    }

    //lay toan bo lich su luong
    @GetMapping("/employee/{userId}/history")
//    @PreAuthorize("hasAnyRole('WORKER', 'LEADER', 'MANAGER', 'FACTORY_MANAGER', 'FACTORY_DIRECTOR', 'HR', 'ADMIN')")
    public ResponseEntity<?> getEmployeePayrollHistory(@PathVariable Integer userId) {
        try {
            List<TbEmployeePayroll> payrolls = payrollService.getEmpPayrollHistory(userId);
            return ResponseEntity.ok(payrolls);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(buildErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(buildErrorResponse("Server Error: " + e.getMessage()));
        }
    }

    @GetMapping("/employee/{userId}/available-years")
//    @PreAuthorize("hasAnyRole('WORKER', 'LEADER', 'MANAGER', 'FACTORY_MANAGER', 'FACTORY_DIRECTOR', 'HR', 'ADMIN')")
    public ResponseEntity<?> getAvailableYears(@PathVariable Integer userId) {
        try {
            List<Integer> years = payrollService.getAvailableYears(userId);
            Map<String, Object> response = new HashMap<>();
            response.put("userId", userId);
            response.put("years", years);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(buildErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(buildErrorResponse("Server Error: " + e.getMessage()));
        }
    }

    @GetMapping("/employee/{userId}/available-months")
//    @PreAuthorize("hasAnyRole('WORKER', 'LEADER', 'MANAGER', 'FACTORY_MANAGER', 'FACTORY_DIRECTOR', 'HR', 'ADMIN')")
    public ResponseEntity<?> getAvailableMonths(@PathVariable Integer userId, @RequestParam Integer year) {
        try {
            List<Integer> months = payrollService.getAvailableMonths(userId, year);
            Map<String, Object> response = new HashMap<>();
            response.put("userId", userId);
            response.put("year", year);
            response.put("months", months);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(buildErrorResponse(e.getMessage()));
        }
    }

    private Map<String, String> buildErrorResponse(String message) {
        Map<String, String> response = new HashMap<>();
        response.put("error", message);
        return response;
    }

    //Tinh luong day du cho employee
    @GetMapping("/calculate-salary")
    public ResponseEntity<?> calculateEmployeeSalary(
            @RequestParam Integer userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) java.time.LocalDate month,
            @RequestParam(required = false) BigDecimal allowance) {

        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            PayrollCalculationDTO result = payrollCalculationService.calEmpSalary(
                    user,
                    month,
                    allowance != null ? allowance : BigDecimal.ZERO
            );

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Calculate salary successfully");
            body.put("data", result);

            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    //2. tinh thue tncn
    @GetMapping("/calculate-tax")
    public ResponseEntity<?> calculatePersonalIncomeTax(
            @RequestParam Integer userId,
            @RequestParam BigDecimal grossIncome,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate month) {

        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            TaxCalculationDTO result = payrollCalculationService.calPersonalIncomeTax(
                    user,
                    grossIncome,
                    month
            );

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Calculate tax successfully");
            body.put("data", result);

            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    // quanr ly ho so thue cuar employ
    @GetMapping("/employee-tax-profile")
    public ResponseEntity<?> getEmployeeTaxProfile(@RequestParam Integer userId) {
        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            var taxProfile = taxProfileService.getOrCreateTaxProfile(user);

            EmployeeTaxProfileDTO dto = new EmployeeTaxProfileDTO();
            dto.setUserId(taxProfile.getUser().getId());
            dto.setUserName(taxProfile.getUser().getFullName());
            dto.setHireDate(taxProfile.getUser().getHireDate());
            dto.setNumberOfDependents(taxProfile.getNumberOfDependents());
            dto.setInsuranceRate(taxProfile.getInsuranceRate());
            dto.setIsEligibleForPersonalDeduction(taxProfile.getIsEligibleForPersonalDeduction());
            dto.setIsEligibleForDependentDeduction(taxProfile.getIsEligibleForDependentDeduction());
            dto.setNote(taxProfile.getNote());

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Get tax profile successfully");
            body.put("data", dto);

            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    //cap nhat thong tin ho so thue cuar employ
    @PutMapping("/employee-tax-profile")
    public ResponseEntity<?> updateEmployeeTaxProfile(
            @RequestParam Integer userId,
            @RequestParam(required = false) Integer numberOfDependents) {

        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (numberOfDependents != null) {
                taxProfileService.updateNumberOfDependents(userId, numberOfDependents);
            }

            var taxProfile = taxProfileService.getOrCreateTaxProfile(user);

            EmployeeTaxProfileDTO dto = new EmployeeTaxProfileDTO();
            dto.setUserId(taxProfile.getUser().getId());
            dto.setUserName(taxProfile.getUser().getFullName());
            dto.setNumberOfDependents(taxProfile.getNumberOfDependents());

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Update tax profile successfully");
            body.put("data", dto);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    //Quan lys bang luong
    @GetMapping("/{payrollId}")
    public ResponseEntity<?> getPayrollDetails(@PathVariable Integer payrollId) {
        try {
            TbPayroll payroll = payrollRepo.findById(payrollId)
                    .orElseThrow(() -> new RuntimeException("Payroll not found"));

            PayrollResponseDTO dto = new PayrollResponseDTO();
            dto.setPayrollId(payroll.getId());
            dto.setMonth(payroll.getMonth());
            dto.setDepartmentName(payroll.getDepartment().getName());
            dto.setTotalSalary(payroll.getTotalSalary());
            dto.setStatus(payroll.getStatus().toString());
            dto.setCreatedDate(payroll.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toLocalDate());

            List<PayrollResponseDTO.EmployeePayrollDetailDTO> employees = payroll.getEmployeePayrolls()
                    .stream()
                    .map(ep -> {
                        PayrollResponseDTO.EmployeePayrollDetailDTO empDto =
                                new PayrollResponseDTO.EmployeePayrollDetailDTO();
                        empDto.setEmployeeId(ep.getUser().getId());
                        empDto.setEmployeeName(ep.getUser().getFullName());
                        empDto.setSalaryType(ep.getUser().getSalaryType().toString());
                        empDto.setBaseSalary(ep.getBaseSalary());
                        empDto.setProductBonus(ep.getProductBonus());
                        empDto.setOvertimePay(ep.getOvertimePay());
                        empDto.setAllowance(ep.getAllowance());
                        empDto.setDeduction(ep.getDeduction());
                        empDto.setTotalPay(ep.getTotalPay());
                        empDto.setNote(ep.getNote());
                        return empDto;
                    })
                    .collect(Collectors.toList());

            dto.setEmployees(employees);
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Get payroll details successfully");
            body.put("data", dto);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }


    }

    //lay history luong cua nhan vien
    @GetMapping("/employee-history")
    public ResponseEntity<?> getEmployeePayrollHistory2(@RequestParam Integer userId) {
        try {
            List<TbEmployeePayroll> payrolls = employeePayrollRepo.findByUserId(userId);

            List<PayrollResponseDTO.EmployeePayrollDetailDTO> dtos = payrolls
                    .stream()
                    .map(ep -> {
                        PayrollResponseDTO.EmployeePayrollDetailDTO empDto =
                                new PayrollResponseDTO.EmployeePayrollDetailDTO();
                        empDto.setEmployeeId(ep.getUser().getId());
                        empDto.setEmployeeName(ep.getUser().getFullName());
                        empDto.setSalaryType(ep.getUser().getSalaryType().toString());
                        empDto.setBaseSalary(ep.getBaseSalary());
                        empDto.setProductBonus(ep.getProductBonus());
                        empDto.setOvertimePay(ep.getOvertimePay());
                        empDto.setAllowance(ep.getAllowance());
                        empDto.setDeduction(ep.getDeduction());
                        empDto.setTotalPay(ep.getTotalPay());
                        return empDto;
                    })
                    .collect(Collectors.toList());
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Get payroll history successfully");
            body.put("data", dtos);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    //lấy ds trợ cấp RECURRING của 1 emp
    @GetMapping("/allowances/recurring")
    public ResponseEntity<?> getRecurringAllowancesByUser(
            @RequestParam Integer userId) {
        Map<String, Object> body = new HashMap<>();
        try {
            var user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            List<TbPayrollAllowance> list = payrollAllowanceRepo.findRecurringByUserAndType(
                    user.getId(), TbPayrollAllowance.AllowanceType.CHILD_CARE // placeholder type
            );

            list = payrollAllowanceRepo.findAll().stream()
                    .filter(a -> a.getUser() != null
                            && a.getUser().getId().equals(user.getId())
                            && a.getScope() == AllowanceScope.RECURRING)
                    .toList();

            LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
            boolean changed = false;
            for (TbPayrollAllowance a : list) {
                boolean shouldInactive = false;

                if (a.getEndMonth() != null && a.getEndMonth().isBefore(currentMonth)) {
                    shouldInactive = true;
                }

                if (user.getStatus() != TbUser.UserStatus.Active) {
                    shouldInactive = true;
                }

                if (shouldInactive && Boolean.TRUE.equals(a.getIsActive())) {
                    a.setIsActive(false);
                    changed = true;
                }
            }
            if (changed) {
                payrollAllowanceRepo.saveAll(list);
            }

            body.put("success", true);
            body.put("message", "Get recurring allowances successfully");
            body.put("data", list);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // trợ cấp dài hạn  RECURRING cho 1 emp
    @PostMapping("/allowances/recurring")
    public ResponseEntity<?> createRecurringAllowance(
            @RequestBody EmpRecurAllowReqDTO request) {

        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getUserId() == null) {
                body.put("success", false);
                body.put("message", "userId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                body.put("success", false);
                body.put("message", "amount must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getStartMonth() == null) {
                body.put("success", false);
                body.put("message", "startMonth is required");
                return ResponseEntity.badRequest().body(body);
            }

            var user = userRepository.findById(request.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found: " + request.getUserId()));

            TbPayrollAllowance.AllowanceType type =
                    request.getType() != null
                            ? request.getType()
                            : TbPayrollAllowance.AllowanceType.OTHER;

            LocalDate newStart = request.getStartMonth().withDayOfMonth(1);
            LocalDate newEnd = request.getEndMonth() != null
                    ? request.getEndMonth().withDayOfMonth(1)
                    : null;

            // start month không được trước hiredate:
            if (user.getHireDate() != null) {
                LocalDate hireMonth = user.getHireDate().withDayOfMonth(1);
                if (newStart.isBefore(hireMonth)) {
                    body.put("success", false);
                    body.put("message",
                            "Allowance start month cannot be before employee hire date (" + hireMonth + ")");
                    return ResponseEntity.badRequest().body(body);
                }
            }

            //1 employee không được có 2 trợ cấp RECURRING trùng AllowanceType và khoảng thời gian chồng lấp
            List<TbPayrollAllowance> existingSameType = payrollAllowanceRepo
                    .findRecurringByUserAndType(user.getId(), type);

            boolean hasOverlap = existingSameType.stream().anyMatch(a -> {
                LocalDate existStart = a.getStartMonth();
                LocalDate existEnd = a.getEndMonth();// co the null

                // kiem tra đk chồng lấp
                boolean endOk = (newEnd == null) || !newEnd.isBefore(existStart);
                boolean startOk = (existEnd == null) || !existEnd.isBefore(newStart);
                return endOk && startOk;
            });

            if (hasOverlap) {
                body.put("success", false);
                body.put("message",
                        "Employee already has a recurring allowance of type " + type +
                                " that overlaps with the given period.");
                return ResponseEntity.badRequest().body(body);
            }
            //tao allơeance mới
            TbPayrollAllowance allowance = new TbPayrollAllowance();
            allowance.setUser(user);
            allowance.setEmployeePayroll(null); // không gắn với 1 payroll cụ thể hết nha
            allowance.setAmount(request.getAmount());
            allowance.setType(type);
            allowance.setScope(AllowanceScope.RECURRING);
            allowance.setStartMonth(newStart);
            allowance.setEndMonth(newEnd);
            allowance.setReason(request.getReason());
            allowance.setIsActive(true);
            allowance.setCreatedAt(Instant.now());

            TbPayrollAllowance saved = payrollAllowanceRepo.save(allowance);

            body.put("success", true);
            body.put("message", "Create recurring allowance successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PostMapping("/allowances/{id}/toggle")
    public ResponseEntity<?> toggleAllowance(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbPayrollAllowance allowance = payrollAllowanceRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Allowance not found: " + id));

            Boolean current = allowance.getIsActive();
            boolean newStatus;

            // nếu đang true -> tắt
            if (Boolean.TRUE.equals(current)) {
                newStatus = false;
            } else {
                // đang false/null -> bật (có ràng buộc)
                TbUser user = allowance.getUser();
                LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);

                if (user.getStatus() != TbUser.UserStatus.Active) {
                    body.put("success", false);
                    body.put("message", "Cannot activate allowance because employee is not Active");
                    return ResponseEntity.badRequest().body(body);
                }

                if (allowance.getEndMonth() != null && allowance.getEndMonth().isBefore(currentMonth)) {
                    body.put("success", false);
                    body.put("message", "Cannot activate allowance because endMonth is in the past");
                    return ResponseEntity.badRequest().body(body);
                }

                newStatus = true;
            }

            allowance.setIsActive(newStatus);
            payrollAllowanceRepo.save(allowance);

            body.put("success", true);
            body.put("message", "Toggle allowance status successfully");
            body.put("data", allowance);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    //edit
    @PutMapping("/allowances/recurring/{id}")
    public ResponseEntity<?> updateRecurringAllowance(
            @PathVariable Integer id,
            @RequestBody EmpRecurAllowReqDTO request) {

        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                body.put("success", false);
                body.put("message", "amount must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getStartMonth() == null) {
                body.put("success", false);
                body.put("message", "startMonth is required");
                return ResponseEntity.badRequest().body(body);
            }

            TbPayrollAllowance allowance = payrollAllowanceRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Allowance not found: " + id));

            if (allowance.getScope() != TbPayrollAllowance.AllowanceScope.RECURRING) {
                body.put("success", false);
                body.put("message", "Only RECURRING allowances can be updated with this endpoint");
                return ResponseEntity.badRequest().body(body);
            }

            TbUser user = allowance.getUser();
            TbPayrollAllowance.AllowanceType newType =
                    request.getType() != null
                            ? request.getType()
                            : (allowance.getType() != null ? allowance.getType()
                            : TbPayrollAllowance.AllowanceType.OTHER);

            LocalDate newStart = request.getStartMonth().withDayOfMonth(1);
            LocalDate newEnd = request.getEndMonth() != null
                    ? request.getEndMonth().withDayOfMonth(1)
                    : null;

            // RÀNG BUỘC: startMonth không được trước hireDate
            if (user.getHireDate() != null) {
                LocalDate hireMonth = user.getHireDate().withDayOfMonth(1);
                if (newStart.isBefore(hireMonth)) {
                    body.put("success", false);
                    body.put("message",
                            "Allowance start month cannot be before employee hire date (" + hireMonth + ")");
                    return ResponseEntity.badRequest().body(body);
                }
            }

            // RÀNG BUỘC: không chồng lấp với các RECURRING cùng type (trừ chính nó)
            List<TbPayrollAllowance> existingSameType = payrollAllowanceRepo
                    .findRecurringByUserAndType(user.getId(), newType);

            boolean hasOverlap = existingSameType.stream()
                    .filter(a -> !a.getId().equals(allowance.getId()))
                    .anyMatch(a -> {
                        LocalDate existStart = a.getStartMonth();
                        LocalDate existEnd = a.getEndMonth();
                        boolean endOk = (newEnd == null) || !newEnd.isBefore(existStart);
                        boolean startOk = (existEnd == null) || !existEnd.isBefore(newStart);
                        return endOk && startOk;
                    });

            if (hasOverlap) {
                body.put("success", false);
                body.put("message",
                        "Employee already has a recurring allowance of type " + newType +
                                " that overlaps with the given period.");
                return ResponseEntity.badRequest().body(body);
            }

            // Cập nhật
            allowance.setAmount(request.getAmount());
            allowance.setType(newType);
            allowance.setStartMonth(newStart);
            allowance.setEndMonth(newEnd);
            allowance.setReason(request.getReason());

            TbPayrollAllowance saved = payrollAllowanceRepo.save(allowance);

            body.put("success", true);
            body.put("message", "Update recurring allowance successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

        //trợ cấp ONE_TIME cho 1 employeePayroll trong payroll
    @PostMapping("/{payrollId}/employee/{employeePayrollId}/allowances")
    public ResponseEntity<?> addOneTimeAllowance(
            @PathVariable Integer payrollId,
            @PathVariable Integer employeePayrollId,
            @RequestBody AllowanceRequestDTO request
    ) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                body.put("success", false);
                body.put("message", "Allowance amount must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }

            // 1. Lấy payroll + employeePayroll, đảm bảo thuộc cùng payroll
            TbPayroll payroll = payrollRepo.findById(payrollId)
                    .orElseThrow(() -> new RuntimeException("Payroll not found: " + payrollId));

            TbEmployeePayroll ep = employeePayrollRepo.findById(employeePayrollId)
                    .orElseThrow(() -> new RuntimeException("Employee payroll not found: " + employeePayrollId));

            if (!ep.getPayroll().getId().equals(payroll.getId())) {
                throw new RuntimeException("EmployeePayroll does not belong to specified payroll");
            }

            // 2. Tạo trợ cấp ONE_TIME
            TbPayrollAllowance allowance = new TbPayrollAllowance();
            allowance.setUser(ep.getUser());
            allowance.setEmployeePayroll(ep);
            allowance.setAmount(request.getAmount());
            allowance.setType(
                    request.getType() != null
                            ? request.getType()
                            : TbPayrollAllowance.AllowanceType.TRAVEL
            );
            allowance.setScope(AllowanceScope.ONE_TIME);
            // startMonth/endMonth = đúng tháng của payroll
            allowance.setStartMonth(payroll.getMonth());
            allowance.setEndMonth(payroll.getMonth());
            allowance.setReason(request.getReason());
            allowance.setIsActive(true);
            allowance.setCreatedAt(Instant.now());

            payrollAllowanceRepo.save(allowance);

            // 3. Tính lại allowance & totalPay cho employee này
            // a. Lấy lại trợ cấp dài hạn (RECURRING) cho tháng này
            List<TbPayrollAllowance> recurring = payrollAllowanceRepo
                    .findRecurringAllowancesForUserAndMonth(
                            ep.getUser().getId(),
                            payroll.getMonth(),
                            AllowanceScope.RECURRING
                    );

            BigDecimal sumRecurring = recurring.stream()
                    .map(TbPayrollAllowance::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // b. Lấy tất cả ONE_TIME của employeePayroll này
            List<TbPayrollAllowance> oneTimes = payrollAllowanceRepo
                    .findByEmployeePayrollAndScope(ep.getId(), AllowanceScope.ONE_TIME);

            BigDecimal sumOneTime = oneTimes.stream()
                    .map(TbPayrollAllowance::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            BigDecimal totalAllowance = sumRecurring.add(sumOneTime);

            ep.setAllowance(totalAllowance);

            // Tính lại totalPay: base + bonus + overtime + allowance - deduction - personalIncomeTax
            BigDecimal base = ep.getBaseSalary() != null ? ep.getBaseSalary() : BigDecimal.ZERO;
            BigDecimal bonus = ep.getProductBonus() != null ? ep.getProductBonus() : BigDecimal.ZERO;
            BigDecimal overtime = ep.getOvertimePay() != null ? ep.getOvertimePay() : BigDecimal.ZERO;
            BigDecimal deduction = ep.getDeduction() != null ? ep.getDeduction() : BigDecimal.ZERO;
            BigDecimal pit = ep.getPersonalIncomeTax() != null ? ep.getPersonalIncomeTax() : BigDecimal.ZERO;

            BigDecimal newTotalPay = base
                    .add(bonus)
                    .add(overtime)
                    .add(totalAllowance)
                    .subtract(deduction)
                    .subtract(pit)
                    .setScale(2, RoundingMode.HALF_UP);

            ep.setTotalPay(newTotalPay);
            employeePayrollRepo.save(ep);

            // 4. Cập nhật lại tổng lương của payroll
            List<TbEmployeePayroll> allEpOfPayroll = employeePayrollRepo.findByPayrollId(payroll.getId());
            BigDecimal newTotalSalary = allEpOfPayroll.stream()
                    .map(TbEmployeePayroll::getTotalPay)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            payroll.setTotalSalary(newTotalSalary);
            payrollRepo.save(payroll);

            body.put("success", true);
            body.put("message", "Add one-time allowance successfully");
            body.put("data", Map.of(
                    "employeePayrollId", ep.getId(),
                    "allowanceTotal", ep.getAllowance(),
                    "totalPay", ep.getTotalPay(),
                    "payrollTotalSalary", payroll.getTotalSalary()
            ));
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // tao bang luong cho bo phan
    @PostMapping("/generate")
    public ResponseEntity<?> generatePayroll(@RequestBody GeneratePayrollRequest request) {
        try {
            Map<String, Object> body = new HashMap<>();

            if (request.getDepartmentId() == null || request.getMonth() == null) {
                body.put("success", false);
                body.put("message", "departmentId and month are required");
                return ResponseEntity.badRequest().body(body);
            }

            //ngày đầu tháng
            LocalDate payrollMonth = request.getMonth().withDayOfMonth(1);

            // Tìm department
            TbDepartment department = departmentRepository.findById(request.getDepartmentId())
                    .orElseThrow(() -> new RuntimeException("Department not found: " + request.getDepartmentId()));

            // Lấy danh sách user thuộc department (lọc Active)
            List<TbUser> users = department.getUsers().stream()
                    .filter(u -> u.getStatus() == TbUser.UserStatus.Active)
                    .toList();

            if (users.isEmpty()) {
                body.put("success", false);
                body.put("message", "No active users in this department to generate payroll");
                return ResponseEntity.badRequest().body(body);
            }

            //kiểm tra trùng payroll cùng tháng + department
            Optional<TbPayroll> existing = payrollRepo.findByDepartmentIdAndMonth(department.getId(), payrollMonth);
            if (existing.isPresent()) {
                body.put("success", false);
                body.put("message", "Payroll for this month already exists");
                return ResponseEntity.badRequest().body(body);
            }

            // Tạo payroll
            TbPayroll payroll = new TbPayroll();
            payroll.setDepartment(department);
            payroll.setMonth(payrollMonth);
            payroll.setStatus(TbPayroll.PayrollStatus.pending);
            payroll.setCreatedAt(Instant.now());

            BigDecimal totalSalary = BigDecimal.ZERO;
            List<TbEmployeePayroll> employeePayrolls = new ArrayList<>();

            for (TbUser user : users) {
                TbEmployeePayroll ep = new TbEmployeePayroll();
                ep.setPayroll(payroll);
                ep.setUser(user);

                BigDecimal baseSalary = user.getBaseSalary() != null ? user.getBaseSalary() : BigDecimal.ZERO;
                ep.setBaseSalary(baseSalary);

                ep.setProductBonus(BigDecimal.ZERO);
                ep.setOvertimePay(BigDecimal.ZERO);
                ep.setDeduction(BigDecimal.ZERO);
                ep.setPersonalIncomeTax(BigDecimal.ZERO);
                ep.setTaxDeductionTotal(BigDecimal.ZERO);

                // tro cap dai hanj cho thang nay
                List<TbPayrollAllowance> recurringAllowances =
                        payrollAllowanceRepo.findRecurringAllowancesForUserAndMonth(
                                user.getId(),
                                payrollMonth,
                                TbPayrollAllowance.AllowanceScope.RECURRING
                        );

                BigDecimal recurringSum = recurringAllowances.stream()
                        .map(TbPayrollAllowance::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                ep.setAllowance(recurringSum);

                //totalPay = baseSalary + trợ cấp dài hạn
                BigDecimal totalPay = baseSalary
                        .add(recurringSum)
                        .setScale(2, RoundingMode.HALF_UP);
                ep.setTotalPay(totalPay);

                ep.setNote("Auto generated payroll for " + payrollMonth.getMonthValue() + "/" + payrollMonth.getYear());
                ep.setCreatedAt(Instant.now());

                totalSalary = totalSalary.add(totalPay);
                employeePayrolls.add(ep);
            }

            payroll.setTotalSalary(totalSalary);
            payroll.setEmployeePayrolls(employeePayrolls);


            TbPayroll saved = payrollRepo.save(payroll);

            body.put("success", true);
            body.put("message", "Generate payroll successfully");
            body.put("data", Map.of(
                    "payrollId", saved.getId(),
                    "departmentId", department.getId(),
                    "departmentName", department.getName(),
                    "month", saved.getMonth(),
                    "totalSalary", saved.getTotalSalary(),
                    "employeeCount", employeePayrolls.size()
            ));
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }

    }

    //duyet bang luong
    @PostMapping("/{payrollId}/approve")
    public ResponseEntity<?> approvePayroll(
            @PathVariable Integer payrollId,
            @RequestBody ApprovePayrollRequest request) {
        try {
            TbPayroll payroll = payrollRepo.findById(payrollId)
                    .orElseThrow(() -> new RuntimeException("Payroll not found"));

            payroll.setStatus(TbPayroll.PayrollStatus.approved);
            payroll.setBalanceNote(request.getApproverNote());
            payrollRepo.save(payroll);

            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Approve payroll successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @GetMapping("/statistics")
    public ResponseEntity<?> getPayrollStatistics() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", Map.of(
                    "totalPayroll", payrollRepo.count(),
                    "approvedPayroll", 0,  // Tính toán từ DB
                    "pendingPayroll", 0,   // Tính toán từ DB
                    "totalSalaryExpense", BigDecimal.ZERO,
                    "monthlyTrend", List.of()
            ));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @GetMapping("/recent")
    public ResponseEntity<?> getRecentPayrolls(@RequestParam(defaultValue = "5") int limit) {
        try {
            // Lấy các payroll gần đây
            List<TbPayroll> payrolls = payrollRepo.findAll().stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .limit(limit)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", payrolls);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @GetMapping("/list")
    public ResponseEntity<?> getPayrollList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) Integer lineId) {
        try {
            // Implement pagination
            List<TbPayroll> payrolls = payrollRepo.findAll();

            if (departmentId != null) {
                payrolls = payrolls.stream()
                        .filter(p -> p.getDepartment().getId().equals(departmentId))
                        .collect(Collectors.toList());
            }

            if (lineId != null) {
                payrolls = payrolls.stream()
                        .filter(p -> p.getEmployeePayrolls().stream()
                                .anyMatch(ep -> ep.getUser().getLine() != null &&
                                        ep.getUser().getLine().getId().equals(lineId)))
                        .collect(Collectors.toList());
            }

            int totalElements = payrolls.size();
            List<TbPayroll> paginatedPayrolls = payrolls.stream()
                    .skip((long) page * size)
                    .limit(size)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", paginatedPayrolls);
            response.put("totalElements", totalElements);
            response.put("totalPages", (totalElements + size - 1) / size);
            response.put("currentPage", page);
            response.put("pageSize", size);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            body.put("data", null);
            return ResponseEntity.badRequest().body(body);
        }
    }

    @GetMapping("/report")
    public ResponseEntity<?> getPayrollReport(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer departmentId) {
        try {
            List<TbPayroll> payrolls = payrollRepo.findAll();

            if (year != null) {
                payrolls = payrolls.stream()
                        .filter(p -> p.getMonth().getYear() == year)
                        .collect(Collectors.toList());
            }
            if (month != null) {
                payrolls = payrolls.stream()
                        .filter(p -> p.getMonth().getMonthValue() == month)
                        .collect(Collectors.toList());
            }
            if (departmentId != null) {
                payrolls = payrolls.stream()
                        .filter(p -> p.getDepartment().getId().equals(departmentId))
                        .collect(Collectors.toList());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", payrolls);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> body = new HashMap<>();
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ApiResponse {
        private Boolean success;
        private String message;
        private Object data;
    }

    @Getter
    @Setter
    public static class GeneratePayrollRequest {
        private Integer departmentId;
        private LocalDate month;
        private BigDecimal allowance;
    }

    @Getter
    @Setter
    public static class ApprovePayrollRequest {
        private String approverNote;
    }

}

