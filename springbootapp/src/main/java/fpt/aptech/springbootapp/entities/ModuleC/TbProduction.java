package fpt.aptech.springbootapp.entities.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tbProduction")
public class TbProduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "production_id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private TbDepartment department;

    @NotNull
    @Column(name = "product_count", nullable = false)
    private Integer productCount;

    @NotNull
    @Column(name = "DOP", nullable = false)
    private LocalDate dop;

    @ColumnDefault("0")
    @Column(name = "unit_price", precision = 15, scale = 1)
    private BigDecimal unitPrice;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}