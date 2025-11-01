package fpt.aptech.springbootapp.entities.Core;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tbUser")
public class TbUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Integer id;

    @Size(max = 255)
    @NotNull
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Size(max = 255)
    @Column(name = "email")
    private String email;

    @Size(max = 20)
    @NotNull
    @Column(name = "phone", nullable = false, length = 20)
    private String phone;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private TbRole role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id")
    private TbDepartment department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "line_id")
    private TbLine line;

    @Lob
    @Column(name = "face_data")
    private String faceData;

    @Size(max = 20)
    @ColumnDefault("'TimeBased'")
    @Column(name = "salary_type", length = 20)
    private String salaryType;

    @ColumnDefault("0")
    @Column(name = "base_salary", precision = 10, scale = 2)
    private BigDecimal baseSalary;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_level_id")
    private TbSkillLevel skillLevel;

    @Column(name = "hire_date")
    private LocalDate hireDate;

    @Size(max = 20)
    @ColumnDefault("'Active'")
    @Column(name = "status", length = 20)
    private String status;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

}