package fpt.aptech.springbootapp.dtos.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;

@Data
public class TbEmployeePayrollDTO {
    private Integer employeePayrollId;
    private Integer userId;
    private Integer employeeCode;
    private String fullName;

    private BigDecimal baseSalary;
    private BigDecimal allowance;
    private BigDecimal productBonus;
    private BigDecimal overtimePay;
    private BigDecimal deduction;
    private BigDecimal personalIncomeTax;
    private BigDecimal taxDeductionTotal;
    private BigDecimal totalPay;

    // Thông tin hien thị popup
    private BigDecimal totalWorkDays;
    private BigDecimal totalOvertimeHours;
    private BigDecimal totalProductionQuantity;

    private String note;
    private Instant createdAt;


//    private Integer payrollId;
//    private Integer employeeId;
//    private String employeeName;
//
//    private Integer payrollMonth;
//    private Integer payrollYear;
//    private BigDecimal baseSalary;
//    private BigDecimal bonus;
//    private BigDecimal deduction;
//    private BigDecimal totalSalary;
//    private String status;
//    private Date createdAt;
//    private Date updatedAt;
//
//    private PayrollDetailDTO payroll;
//
//    @Data
//    @NoArgsConstructor
//    @AllArgsConstructor
//    public static class PayrollDetailDTO {
//        private Integer payrollId;
//        private Integer departmentId;
//        private String departmentName;
//        private BigDecimal payrollAmount;
//        private String payrollStatus;
//    }
}
