package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;
import fpt.aptech.springbootapp.dtos.response.TbEmployeePayrollDTO;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.time.Instant;


@Data
public class PayrollResponseDTO {
    private Integer payrollId;
    private Integer departmentId;
    private String departmentName;

    private LocalDate month;
    private BigDecimal totalSalary;
    private String status;
    private Instant createdAt;

    // Danh sách lương chi tiết theo từng employee
    private List<TbEmployeePayrollDTO> employeePayrolls;

//    private Integer payrollId;
//    private LocalDate month;
//    private String departmentName;
//    private BigDecimal totalSalary;
//    private String status;
//    private LocalDate createdDate;
//
//    private List<EmployeePayrollDetailDTO> employees;
//
//    @Getter
//    @Setter
//    @NoArgsConstructor
//    @AllArgsConstructor
//    public static class EmployeePayrollDetailDTO {
//        private Integer employeeId;
//        private String employeeName;
//        private String salaryType;
//
//        private BigDecimal baseSalary;
//        private BigDecimal productBonus;
//        private BigDecimal overtimePay;
//        private BigDecimal allowance;
//        private BigDecimal deduction;
//        private BigDecimal totalPay;
//
//        private String note;
//    }
}