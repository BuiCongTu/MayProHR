package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbPayrollTaxCalculation")
public class TbPayrollTaxCalculation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_payroll_id", nullable = false)
    @JsonBackReference
    private TbEmployeePayroll employeePayroll;

    @NotNull
    @Column(name = "gross_income", precision = 15, scale = 2)
    private BigDecimal grossIncome;  // Thu nhập từ lương

    @ColumnDefault("0")
    @Column(name = "insurance_deduction", precision = 15, scale = 2)
    private BigDecimal insuranceDeduction = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "personal_deduction", precision = 15, scale = 2)
    private BigDecimal personalDeduction = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "dependent_deduction", precision = 15, scale = 2)
    private BigDecimal dependentDeduction = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "other_deduction", precision = 15, scale = 2)
    private BigDecimal otherDeduction = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_deduction", precision = 15, scale = 2)
    private BigDecimal totalDeduction;

    @NotNull
    @Column(name = "taxable_income", precision = 15, scale = 2)
    private BigDecimal taxableIncome;  // Thu nhập tính thuế

    //tax
    @ColumnDefault("0")
    @Column(name = "bracket_1_tax", precision = 15, scale = 2)
    private BigDecimal bracket1Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_2_tax", precision = 15, scale = 2)
    private BigDecimal bracket2Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_3_tax", precision = 15, scale = 2)
    private BigDecimal bracket3Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_4_tax", precision = 15, scale = 2)
    private BigDecimal bracket4Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_5_tax", precision = 15, scale = 2)
    private BigDecimal bracket5Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_6_tax", precision = 15, scale = 2)
    private BigDecimal bracket6Tax = BigDecimal.ZERO;

    @ColumnDefault("0")
    @Column(name = "bracket_7_tax", precision = 15, scale = 2)
    private BigDecimal bracket7Tax = BigDecimal.ZERO;

    @NotNull
    @Column(name = "total_tax", precision = 15, scale = 2)
    private BigDecimal totalTax;

    @Lob
    @Column(name = "calculation_detail", columnDefinition = "NVARCHAR(MAX)")
    private String calculationDetail;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}