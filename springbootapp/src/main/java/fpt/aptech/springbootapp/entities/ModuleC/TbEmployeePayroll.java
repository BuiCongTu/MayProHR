package fpt.aptech.springbootapp.entities.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "tbEmployeePayroll")
public class TbEmployeePayroll {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "detail_id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false)
    private TbPayroll payroll;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private TbUser user;

    @NotNull
    @Column(name = "base_salary", nullable = false, precision = 12, scale = 2)
    private BigDecimal baseSalary;

    @ColumnDefault("0")
    @Column(name = "product_bonus", precision = 12, scale = 2)
    private BigDecimal productBonus;

    @ColumnDefault("0")
    @Column(name = "overtime_pay", precision = 12, scale = 2)
    private BigDecimal overtimePay;

    @ColumnDefault("0")
    @Column(name = "allowance", precision = 12, scale = 2)
    private BigDecimal allowance;

    @ColumnDefault("0")
    @Column(name = "deduction", precision = 12, scale = 2)
    private BigDecimal deduction;

    @NotNull
    @Column(name = "total_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPay;

    @Lob
    @Column(name = "note")
    private String note;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}