package fpt.aptech.springbootapp.services.interfaces;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.PositionChangeRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SalaryIncreaseRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SkillLevelChangeRequest;
import fpt.aptech.springbootapp.filter.ProposalFilter;

public interface ProposalService {

    Page<ProposalDTO> getFilteredProposal(ProposalFilter filter, Pageable pageable);

    ProposalDTO createSalaryIncreaseProposal(SalaryIncreaseRequest req);

    ProposalDTO createPositionChangeProposal(PositionChangeRequest req);

    ProposalDTO createSkillLevelChangeProposal(SkillLevelChangeRequest req);

    ProposalDTO approveProposal(Integer proposalId, Integer approverId);

    ProposalDTO rejectProposal(Integer proposalId, Integer approverId, String rejectReason);

}
