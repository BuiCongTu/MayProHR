package fpt.aptech.springbootapp.filter;

import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalStatus;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalType;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
public class ProposalFilter {
    private Integer id;
    private ProposalType type;
    private Integer proposerId;
    private Integer targetUserId;
    private ProposalStatus status;
    private Integer approvedById;
    private Instant createdAfter;
    private Instant createdBefore;
}