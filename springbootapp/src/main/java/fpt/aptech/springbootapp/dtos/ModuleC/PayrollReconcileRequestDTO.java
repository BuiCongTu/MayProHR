package fpt.aptech.springbootapp.dtos.ModuleC;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollReconcileRequestDTO {

    private Integer userId;
    private Integer employeePayrollId; // optional: dùng để hiển thị đối soát
    private LocalDate payrollMonth;    // bắt buộc

    // Input manual (bắt buộc cho compute)
    private String salaryType; // "TimeBased" | "ProductBased"

    private BigDecimal baseSalary;
    private BigDecimal wageCoefficient;

    private BigDecimal standardWorkingDays;
    private BigDecimal actualWorkingDays;

    private Integer lateCount;
    private BigDecimal latePenaltyPerTime;

    private BigDecimal ot1Hours;
    private BigDecimal ot2Hours;

    // Product-based
    private Integer productCount;
    private BigDecimal unitPrice;

    // Allowance
    private BigDecimal allowance;
    private BigDecimal overridePersonalDeduction;
    private BigDecimal overrideDependentDeduction;

}