package fpt.aptech.springbootapp.entities.System;

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
@Table(name = "tbDeductionRule")
public class TbDeductionRule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @Column(name = "rule_name", length = 255)
    private String ruleName;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type")
    private DeductionType deductionType;

    @Column(name = "percentage", precision = 5, scale = 2)
    private BigDecimal percentage;  // 10.5%

    @Column(name = "fixed_amount", precision = 15, scale = 2)
    private BigDecimal fixedAmount;

    @Column(name = "late_deduction_per_time", precision = 15, scale = 2)
    private BigDecimal lateDeductionPerTime;  // 50000 VND/lần

    @Column(name = "description", columnDefinition = "NVARCHAR(500)")
    private String description;

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive = true;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    public enum DeductionType {
        PERCENTAGE,      // % của lương cơ bản
        FIXED,           // Số tiền cố định
        FORMULA,         // Tính toán phức tạp
        LATE_PENALTY     // Phạt muộn
    }
}