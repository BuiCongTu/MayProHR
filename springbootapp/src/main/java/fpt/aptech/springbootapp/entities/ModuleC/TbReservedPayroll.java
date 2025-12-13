package fpt.aptech.springbootapp.entities.ModuleC;

import java.math.BigDecimal;
import java.time.Instant;

import org.hibernate.annotations.ColumnDefault;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbReservedPayroll")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

public class TbReservedPayroll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "reserved_id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payroll_id", nullable = false)
    @JsonIgnore
    private TbPayroll payroll;

    @NotNull
    @Column(name = "reserved_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal reservedAmount;

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
