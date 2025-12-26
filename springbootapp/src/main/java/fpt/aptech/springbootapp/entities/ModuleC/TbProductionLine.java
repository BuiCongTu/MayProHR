package fpt.aptech.springbootapp.entities.ModuleC;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
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
@Table(name = "tbProductionLine", indexes = {
        @Index(name = "idx_production_line", columnList = "production_id, line_id"),
        @Index(name = "idx_subline_dept", columnList = "subline_id, department_id")
})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TbProductionLine {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "production_id", nullable = false)
    private TbProduction production;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "line_id", nullable = false)
    private TbLine line;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "subline_id", nullable = false)
    private TbLine subline;

    /**
     * Số lượng sản phẩm của subLine này sản xuất
     * A = productCount * unitPrice
     * B = A * countContribution
     */
    @NotNull
    @Column(name = "count_contribution", nullable = false)
    private Integer countContribution;

    /**
     * Tổng giờ công chính thức + giờ tăng ca của SubLine
     * C = standardWorkingDays * 8 + (tổng giờ tăng ca)
     */
    @NotNull
    @Column(name = "total_working_hours", nullable = false)
    private Long totalWorkingHours;

    /**
     * Lương sản phẩm tính theo giờ
     * salary_product_per_hour = B / C
     */
    @Column(name = "product_salary_per_hour", precision = 15, scale = 4)
    private BigDecimal productSalaryPerHour;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}