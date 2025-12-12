package fpt.aptech.springbootapp.entities.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.*;

import java.math.*;
import java.time.*;

@Entity
@Table(name = "tbPayrollAllowance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TbPayrollAllowance {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private TbUser user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_payroll_id")
    private TbEmployeePayroll employeePayroll;

    @NotNull
    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50)
    private AllowanceType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "scope", length = 20)
    private AllowanceScope scope = AllowanceScope.RECURRING;

    @NotNull
    @Column(name = "start_month", nullable = false)
    private LocalDate startMonth;

    @Column(name = "end_month")
    private LocalDate endMonth;

    @Lob
    @Column(name = "reason")
    private String reason;

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive = true;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    public enum AllowanceType {
        CHILD_CARE,      // trợ cấp nuôi con nhỏ
        HAZARD,          // độc hại
        POSITION,        // chức vụ
        SENIORITY,       // thâm niên
        TRAVEL,          // công tác
        OTHER
    }

    public enum AllowanceScope {
        RECURRING, // dài hạn
        ONE_TIME
    }


}