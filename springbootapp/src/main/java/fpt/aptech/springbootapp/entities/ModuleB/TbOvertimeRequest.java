package fpt.aptech.springbootapp.entities.ModuleB;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "tbOvertimeRequest")
public class TbOvertimeRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id", nullable = false)
    private Integer id;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "factory_manager_id", nullable = false)
    private TbUser factoryManager;

    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private TbDepartment department;

    @NotNull
    @Column(name = "overtime_time", nullable = false)
    private Double overtimeTime;

    @NotNull
    @Column(name = "num_employees", nullable = false)
    private Integer numEmployees;

    @Size(max = 20)
    @ColumnDefault("'pending'")
    @Column(name = "status", length = 20)
    private String status;

    @Lob
    @Column(name = "details")
    private String details;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}