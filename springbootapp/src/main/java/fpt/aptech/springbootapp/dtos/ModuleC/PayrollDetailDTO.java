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
    // Payroll info
    private Integer employeePayrollId;
    private Integer payrollId;
    private LocalDate payrollMonth;
    private String departmentName;

    // User infomation
    private Integer userId;
    private String fullName;
    private String salaryType;  // TimeBased, ProductBased
    private LocalDate hireDate;

    // chung giữa 2 loại luong
    private BigDecimal baseSalary;
    private BigDecimal wageCoefficient;

    //TimeBased
    private BigDecimal standardWorkingDays;
    private BigDecimal actualWorkingDays;
    private BigDecimal paidLeaveDays;
    private BigDecimal unpaidLeaveDays;
    private Integer lateCount;
    private BigDecimal latePenalty;
    private BigDecimal timeSalary;
    private BigDecimal incomeAfterDeductions;

    // ProductBased
    private Integer productCount;
    private BigDecimal unitPrice;
    private BigDecimal productBonus;

    //OT
    private BigDecimal ot1Hours;     // OT ngày thường
    private BigDecimal ot2Hours;     // OT ngày lễ/chủ nhật
    private BigDecimal overtimePay;

    // cac khoan khau tru thuế
    private BigDecimal insurance;
    private BigDecimal totalDeduction;
    private BigDecimal grossIncomeForTax;
    private BigDecimal personalIncomeTax;
    private BigDecimal taxDeductionTotal;

// chi tiet giam tru lấy từ TaxCalculationDTO
    private BigDecimal personalDeduction;
    private BigDecimal dependentDeduction;
    private BigDecimal insuranceDeduction;
    private BigDecimal taxableIncome;

    //phụ cấp
    private BigDecimal allowance;
    private BigDecimal totalPay;

    private String note;
    private Instant createdAt;

}
