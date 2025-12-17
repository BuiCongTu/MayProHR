package fpt.aptech.springbootapp.entities.ModuleA;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fpt.aptech.springbootapp.entities.Core.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.*;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbLeaveRequest")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})

public class TbLeaveRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "request_id", nullable = false)
    private Integer id;

    //employee xin nghi N:1
    @NotNull
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private TbUser user;

    //n:1
    @NotNull
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "leave_reason_id", nullable = false)
    private TbLeaveReason leaveReason;

    @Enumerated(EnumType.STRING)
    @NotNull
    @Column(name = "type", nullable = false, length = 20)
    private LeaveType type;

    @NotNull
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @NotNull
    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Lob
    @Column(name = "reason")
    private String reason;

    @Lob
    @Column(name = "comment")
    private String comment;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'pending'")
    @Column(name = "status", length = 20)
    private LeaveStatus status = LeaveStatus.pending;

    //n:1 Manager xac nhan
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by")
    private TbUser confirmedBy;

    //n:1 factory manager duyet
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private TbUser approvedBy;

    @Lob
    @Column(name = "reject_reason")
    private String rejectReason;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;

    public enum LeaveType {
        ShortTerm, LongTerm, Maternity, Accident, Other
    }

    public enum LeaveStatus {
        pending, confirmed, approved, rejected
    }

}