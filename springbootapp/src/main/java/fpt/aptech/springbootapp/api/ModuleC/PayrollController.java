package fpt.aptech.springbootapp.api.ModuleC;

import fpt.aptech.springbootapp.dtos.ModuleC.EmployeeTaxProfileDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.PayrollResponseDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
import fpt.aptech.springbootapp.dtos.response.ApiResponse;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayroll;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeePayrollRepo;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.PayrollRepo;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.ModuleC_Payroll.EmployeeTaxProfileService;
import fpt.aptech.springbootapp.services.ModuleC_Payroll.PayrollCalculationService;
import fpt.aptech.springbootapp.services.ModuleC_Payroll.PayrollService;
import fpt.aptech.springbootapp.services.ModuleC_Payroll.PersonalIncomeTaxCalService;
import lombok.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payroll")
//@CrossOrigin(origins = "*")
public class PayrollController {
    private PayrollService payrollService;
    private final PayrollCalculationService payrollCalculationService;
    private final EmployeeTaxProfileService taxProfileService;
    private final PersonalIncomeTaxCalService taxCalculationService;
    private final UserRepository userRepository;
    private final EmployeePayrollRepo employeePayrollRepo;
    private final PayrollRepo payrollRepo;

    @Autowired
    public PayrollController(PayrollService payrollService,
                             PayrollCalculationService payrollCalculationService,
                             EmployeeTaxProfileService taxProfileService,
                             PersonalIncomeTaxCalService taxCalculationService,
                             UserRepository userRepository,
                             EmployeePayrollRepo employeePayrollRepo,
                             PayrollRepo payrollRepo) {
        this.payrollService = payrollService;
        this.payrollCalculationService = payrollCalculationService;
        this.taxProfileService = taxProfileService;
        this.taxCalculationService = taxCalculationService;
        this.userRepository = userRepository;
        this.employeePayrollRepo = employeePayrollRepo;
        this.payrollRepo = payrollRepo;
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

    // tao bang luong cho bo phan
    @PostMapping("/generate")
    public ResponseEntity<?> generatePayroll(@RequestBody GeneratePayrollRequest request) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("success", true);
            body.put("message", "Generate payroll successfully");
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

