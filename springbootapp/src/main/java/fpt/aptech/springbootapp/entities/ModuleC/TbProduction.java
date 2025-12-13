package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.math.*;
import java.time.*;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbProduction", indexes = {
        @Index(name = "idx_dept_date", columnList = "department_id, DOP")
})//productionRepository.findByDepartmentAndDop(deptId, date);
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

public class TbProduction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
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
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}