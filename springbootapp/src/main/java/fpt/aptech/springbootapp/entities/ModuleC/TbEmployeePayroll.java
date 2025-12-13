package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.*;

import java.math.*;
import java.time.*;

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

}
