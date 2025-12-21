package fpt.aptech.springbootapp.entities.ModuleC;

import java.math.BigDecimal;
import java.time.Instant;

import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbEmployeePayroll", indexes = {
    @Index(name = "idx_user_payroll", columnList = "user_id, payroll_id")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "payroll", "user"})
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TbEmployeePayroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false)
    @JsonBackReference
    private TbPayroll payroll;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonBackReference
    private TbUser user;

    @NotNull
    @Column(name = "base_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseSalary;

    @ColumnDefault("0")
    @Column(name = "product_bonus", precision = 15, scale = 2)
    private BigDecimal productBonus = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "overtime_pay", precision = 15, scale = 2)
    private BigDecimal overtimePay = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "allowance", precision = 15, scale = 2)
    private BigDecimal allowance = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "deduction", precision = 15, scale = 2)
    private BigDecimal deduction = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "personal_income_tax", precision = 15, scale = 2)
    private BigDecimal personalIncomeTax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "tax_deduction_total", precision = 15, scale = 2)
    private BigDecimal taxDeductionTotal = BigDecimal.ZERO;

    @OneToOne(mappedBy = "employeePayroll", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private TbPayrollTaxCalculation taxCalculation;

    @NotNull
    @Column(name = "total_pay", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalPay;

    @Lob
    @Column(name = "note")
    private String note;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    // Time-base allocation fields (Branch D)
    @Column(name = "timebase_hours", precision = 10, scale = 2)
    private BigDecimal timeBaseHours;

    @Column(name = "timebase_weight", precision = 10, scale = 2)
    private BigDecimal timeBaseWeight;

    @Column(name = "timebase_allocated_salary", precision = 15, scale = 2)
    private BigDecimal timeBaseAllocatedSalary;

    // them chi tiet tinh luong
    @ColumnDefault("26")
    @Column(name = "standard_working_days", precision = 5, scale = 2)
    private BigDecimal standardWorkingDays = new BigDecimal("26");

    @Column(name = "actual_working_days", precision = 5, scale = 2)
    private BigDecimal actualWorkingDays = BigDecimal.ZERO;

    @Column(name = "paid_leave_days", precision = 5, scale = 2)
    private BigDecimal paidLeaveDays = BigDecimal.ZERO;

    @Column(name = "unpaid_leave_days", precision = 5, scale = 2)
    private BigDecimal unpaidLeaveDays = BigDecimal.ZERO;

    @Column(name = "late_count")
    private Integer lateCount = 0;

    @Column(name = "late_penalty", precision = 15, scale = 2)
    private BigDecimal latePenalty = BigDecimal.ZERO;

    @Column(name = "ot1_hours", precision = 10, scale = 2)
    private BigDecimal ot1Hours = BigDecimal.ZERO;  // OT ngày thường * 1.5

    @Column(name = "ot2_hours", precision = 10, scale = 2)
    private BigDecimal ot2Hours = BigDecimal.ZERO;  // OT ngày lễ/chủ nhật * 2.0

    @Column(name = "regular_hours", precision = 10, scale = 2)
    private BigDecimal regularHours = BigDecimal.ZERO;

    @Column(name = "weight", precision = 10, scale = 2)
    private BigDecimal weight = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "salary_type", length = 20)
    private TbUser.SalaryType salaryType;

    @Column(name = "gross_income_for_tax", precision = 15, scale = 2)
    private BigDecimal grossIncomeForTax = BigDecimal.ZERO;

    @Column(name = "income_after_deductions", precision = 15, scale = 2)
    private BigDecimal incomeAfterDeductions = BigDecimal.ZERO;

    public enum CalculationStatus {
        draft, calculated, confirmed
    }

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'draft'")
    @Column(name = "calculation_status", length = 20)
    private CalculationStatus calculationStatus = CalculationStatus.draft;

}
