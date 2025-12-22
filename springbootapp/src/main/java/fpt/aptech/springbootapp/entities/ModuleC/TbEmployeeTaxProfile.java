package fpt.aptech.springbootapp.entities.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbEmployeeTaxProfile")
public class TbEmployeeTaxProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private TbUser user;

    @ColumnDefault("0")
    @Column(name = "number_of_dependents")
    private Integer numberOfDependents = 0;

    @ColumnDefault("10.5")
    @Column(name = "insurance_rate", precision = 5, scale = 2)
    private BigDecimal insuranceRate = new BigDecimal("10.5");

    @ColumnDefault("0")
    @Column(name = "is_eligible_for_personal_deduction")
    private Boolean isEligibleForPersonalDeduction = false;

    //Cho phép tính giảm trừ phụ thuộc
    @ColumnDefault("0")
    @Column(name = "is_eligible_for_dependent_deduction")
    private Boolean isEligibleForDependentDeduction = false;

    @Column(name = "note", columnDefinition = "NVARCHAR(255)")
    private String note;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;
}