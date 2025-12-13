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
@Table(name = "tbTaxDeduction")
public class TbTaxDeduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @Column(name = "deduction_type", length = 100)
    private String deductionType;  // PERSONAL, DEPENDENT, INSURANCE, OTHER

    @NotNull
    @Column(name = "deduction_amount", precision = 15, scale = 2)
    private BigDecimal deductionAmount;

    @Column(name = "description", columnDefinition = "NVARCHAR(255)")
    private String description;

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "applicable_from")
    private java.time.LocalDate applicableFrom;  // Ngày bắt đầu áp dụng

    @Column(name = "applicable_to")
    private java.time.LocalDate applicableTo;    // Ngày kết thúc áp dụng

    @Column(name = "created_at")
    private Instant createdAt;
}