package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonBackReference;
import fpt.aptech.springbootapp.entities.System.TbDeductionRule;
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
@Table(name = "tbPayrollDeduction")
public class TbPayrollDeduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_payroll_id", nullable = false)
    @JsonBackReference
    private TbEmployeePayroll employeePayroll;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "deduction_rule_id", nullable = false)
    private TbDeductionRule deductionRule;

    @NotNull
    @Column(name = "deduction_amount", precision = 15, scale = 2)
    private BigDecimal deductionAmount;

    @Column(name = "calculation_basis", columnDefinition = "NVARCHAR(255)")
    private String calculationBasis;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}