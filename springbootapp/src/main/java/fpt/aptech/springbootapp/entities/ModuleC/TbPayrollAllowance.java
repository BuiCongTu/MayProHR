package fpt.aptech.springbootapp.entities.ModuleC;

import jakarta.persistence.*;
import jakarta.persistence.Table;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_payroll_id", nullable = false)
    private TbEmployeePayroll employeePayroll;

    @Column(name = "allowance_type", length = 100)
    private String allowanceType;  // "Phụ cấp gia đình", "Phụ cấp vị trí", etc.

    @Column(name = "allowance_amount", precision = 15, scale = 2)
    private BigDecimal allowanceAmount;

    @Column(name = "description")
    private String description;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}