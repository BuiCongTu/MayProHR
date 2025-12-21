package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder

public class PayrollDetailDTO {
    // === THÔNG TIN BẢNG LƯƠNG ===
    private Integer employeePayrollId;
    private Integer payrollId;
    private LocalDate payrollMonth;
    private String departmentName;

    // === THÔNG TIN NHÂN VIÊN ===
    private Integer userId;
    private String fullName;
    private String salaryType;  // TimeBased, ProductBased
    private LocalDate hireDate;

    // === CÓ THÀNH PHẦN CHUNG ===
    private BigDecimal baseSalary;
    private BigDecimal wageCoefficient;

    // === CHỈ CHO TimeBased ===
    private BigDecimal standardWorkingDays;
    private BigDecimal actualWorkingDays;
    private BigDecimal paidLeaveDays;
    private BigDecimal unpaidLeaveDays;
    private Integer lateCount;
    private BigDecimal latePenalty;
    private BigDecimal timeSalary;

    // === CHỈ CHO ProductBased ===
    private Integer productCount;
    private BigDecimal unitPrice;
    private BigDecimal productBonus;

    // === LƯƠNG TĂNG CA (CẢ HAI) ===
    private BigDecimal ot1Hours;     // OT ngày thường
    private BigDecimal ot2Hours;     // OT ngày lễ/chủ nhật
    private BigDecimal overtimePay;

    // === KHOẢN KHẤU TRỪ & THUẾ ===
    private BigDecimal insurance;
    private BigDecimal totalDeduction;
    private BigDecimal grossIncomeForTax;
    private BigDecimal personalIncomeTax;
    private BigDecimal taxDeductionTotal;

    // === PHỤ CẤP & TỔNG ===
    private BigDecimal allowance;
    private BigDecimal totalPay;

    // === GHI CHÚ ===
    private String note;
    private Instant createdAt;

}
