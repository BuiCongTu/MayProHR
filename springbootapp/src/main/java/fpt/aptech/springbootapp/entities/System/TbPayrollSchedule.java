package fpt.aptech.springbootapp.entities.System;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbPayrollSchedule")
public class TbPayrollSchedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @Column(name = "payroll_month", nullable = false)
    private LocalDate payrollMonth;  // 2025-12-01

    @NotNull
    @Column(name = "data_collection_start_date", nullable = false)
    private LocalDate dataCollectionStartDate;

    @NotNull
    @Column(name = "data_collection_end_date", nullable = false)
    private LocalDate dataCollectionEndDate;

    @NotNull
    @Column(name = "calculation_deadline", nullable = false)
    private LocalDate calculationDeadline;

    @NotNull
    @Column(name = "approval_deadline", nullable = false)
    private LocalDate approvalDeadline;

    @Column(name = "salary_payment_date")
    private LocalDate salaryPaymentDate;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'planning'")
    @Column(name = "status")
    private PayrollScheduleStatus status;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    public enum PayrollScheduleStatus {
        planning, data_collecting, calculating, awaiting_approval, approved, paid
    }
}