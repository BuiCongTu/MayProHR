package fpt.aptech.springbootapp.services.interfaces;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.*;
import fpt.aptech.springbootapp.filter.ProposalFilter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProposalService {
    Page<ProposalDTO> getFilteredProposal(ProposalFilter filter, Pageable pageable);

    ProposalDTO createSalaryIncreaseProposal(SalaryIncreaseRequest req);
    ProposalDTO createPositionChangeProposal(PositionChangeRequest req);
    ProposalDTO createSkillLevelChangeProposal(SkillLevelChangeRequest req);

    ProposalDTO approveProposal(Integer proposalId, Integer approverId);
    ProposalDTO rejectProposal(Integer proposalId, Integer approverId, String rejectReason);
}
