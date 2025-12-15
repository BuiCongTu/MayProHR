package fpt.aptech.springbootapp.entities.ModuleC;

import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.ColumnDefault;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbEmployeeWorkTime")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class TbEmployeeWorkTime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Integer id;

    //mỗi phiếu lương có 1 bộ chỉ số làm việc
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_payroll_id", nullable = false, unique = true)
    private TbEmployeePayroll employeePayroll;

    @Column(name = "working_days", precision = 10, scale = 2)
    private BigDecimal workingDays;
//gio lam ngay tuongh
    @Column(name = "regular_hours", precision = 10, scale = 2)
    private BigDecimal regularHours;

    @Column(name = "ot_weekday_hours", precision = 10, scale = 2)
    private BigDecimal otWeekdayHours;

    @Column(name = "ot_holiday_hours", precision = 10, scale = 2)
    private BigDecimal otHolidayHours;

    @Column(name = "weight", precision = 15, scale = 2)
    private BigDecimal weight;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}
