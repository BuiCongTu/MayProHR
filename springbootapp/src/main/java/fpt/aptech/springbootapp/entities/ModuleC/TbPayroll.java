package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fpt.aptech.springbootapp.entities.Core.TbDepartment;
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
import java.util.*;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbPayroll", indexes = {
        @Index(name = "idx_month_status", columnList = "month, status")
})//payrollRepository.findByMonthAndStatus(LocalDate.of(2025, 10, 1), "approved");
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

public class TbPayroll {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @Column(name = "month", nullable = false)
    private LocalDate month;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private TbDepartment department;

    @NotNull
    @Column(name = "total_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalSalary;

    @Lob
    @Column(name = "details")
    private String details;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'pending'")
    @Column(name = "status", length = 20)
    private PayrollStatus status = PayrollStatus.pending;

    @Column(name = "year_month", length = 20)
    private String yearMonth;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private TbUser createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private TbUser approvedBy;

    @Lob
    @Column(name = "balance_note")
    private String balanceNote;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    @OneToMany(mappedBy = "payroll", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TbEmployeePayroll> employeePayrolls = new ArrayList<>();

    @OneToMany(mappedBy = "payroll", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TbReservedPayroll> reservedPayrolls = new ArrayList<>();

    public enum PayrollStatus {
        pending, balanced, approved, rejected
    }

}