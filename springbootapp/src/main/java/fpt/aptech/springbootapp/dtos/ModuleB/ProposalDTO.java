package fpt.aptech.springbootapp.dtos.ModuleB;

import java.time.Instant;

import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalStatus;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProposalDTO {

    private Integer id;
    private ProposalType type;

    private Integer proposerId;
    private String proposerName;

    private Integer targetUserId;
    private String targetUserName;

    private String details;
    private String reason;

    private ProposalStatus status;

    private Integer approvedById;
    private String approvedByName;

    private String rejectReason;

    private Instant createdAt;

}
