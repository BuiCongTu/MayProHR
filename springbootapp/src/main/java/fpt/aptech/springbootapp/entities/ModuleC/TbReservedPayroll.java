package fpt.aptech.springbootapp.entities.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.Nationalized;

import java.math.BigDecimal;
import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "tbReservedPayroll")
public class TbReservedPayroll {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reserved_id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false)
    private TbPayroll payroll;

    @NotNull
    @Column(name = "reserved_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal reservedAmount;

    @Nationalized
    @Lob
    @Column(name = "details")
    private String details;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private TbUser createdBy;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}