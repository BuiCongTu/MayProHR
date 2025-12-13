package fpt.aptech.springbootapp.entities.ModuleB;

import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Getter @Setter @Entity @NoArgsConstructor @AllArgsConstructor
@Table(name = "tbProposal")
public class TbProposal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "proposal_id", nullable = false)
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    private ProposalType type;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "proposer_id", nullable = false)
    private fpt.aptech.springbootapp.entities.Core.TbUser proposer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_user_id", nullable = false)
    private fpt.aptech.springbootapp.entities.Core.TbUser targetUser;

    @Lob
    @Column(name = "details")
    private String details;

    @Lob
    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private ProposalStatus status = ProposalStatus.pending;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private fpt.aptech.springbootapp.entities.Core.TbUser approvedBy;

    @Lob
    @Column(name = "reject_reason")
    private String rejectReason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    public enum ProposalType { SalaryIncrease, PositionChange, SkillLevelChange }
    public enum ProposalStatus { pending, confirmed, approved, rejected }
}