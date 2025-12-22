package fpt.aptech.springbootapp.dtos.response;

import java.math.BigDecimal;
import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonFormat;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TbEmployeePayrollDTO {
    private Integer employeePayrollId;
    private Integer userId;
    private Integer employeeCode;
    private String fullName;
    private String salaryType;
    private String calculationStatus;

    private Integer lateCount;
    private BigDecimal latePenalty;

    private BigDecimal grossIncomeForTax;
    private BigDecimal incomeAfterDeductions;

    // Lương
    private BigDecimal baseSalary;
    private BigDecimal allowance;
    private BigDecimal productBonus;
    private BigDecimal overtimePay;
    private BigDecimal deduction;
    private BigDecimal personalIncomeTax;
    private BigDecimal taxDeductionTotal;
    private BigDecimal totalPay;

    // Công / giờ (cũ)
    private BigDecimal totalWorkDays;
    private BigDecimal totalOvertimeHours;
    private BigDecimal totalProductionQuantity;

    // Công / giờ chi tiết (mới cho TimeBased + OT1/OT2)
    private BigDecimal actualWorkingDays;         // số ngày công thực tế
    private BigDecimal paidLeaveDays;             // ngày phép có lương
    private BigDecimal unpaidLeaveDays;           // ngày phép không lương
    private BigDecimal otWeekdayHours;            // OT1: ngày thường
    private BigDecimal otHolidayHours;            // OT2: CN/lễ

    // Ghi chú
    private String note;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private Instant createdAt;
}