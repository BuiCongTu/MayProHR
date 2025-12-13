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
@Table(name = "tbTaxBracket")
public class TbTaxBracket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @Column(name = "bracket_number")
    private Integer bracketNumber;  // 1, 2, 3, 4, 5

    @NotNull
    @Column(name = "from_income", precision = 15, scale = 2)
    private BigDecimal fromIncome;  // 0, 10M, 30M, 60M, 100M

    @NotNull
    @Column(name = "to_income", precision = 15, scale = 2)
    private BigDecimal toIncome;    // 10M, 30M, 60M, 100M ∞

    @NotNull
    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate;     // 5%, 10%, 20%, 30%, 35%

    @Column(name = "description", columnDefinition = "NVARCHAR(255)")
    private String description;

    @ColumnDefault("1")
    @Column(name = "is_active")
    private Boolean isActive = true;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}