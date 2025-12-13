package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.PositionChangeRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SalaryIncreaseRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SkillLevelChangeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal;
import fpt.aptech.springbootapp.filter.ProposalFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.ProposalMapper;
import fpt.aptech.springbootapp.repositories.ModuleB.ProposalRepository;
import fpt.aptech.springbootapp.services.interfaces.ProposalService;
import fpt.aptech.springbootapp.specifications.ProposalSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class ProposalServiceImpl implements ProposalService {

    private final ProposalRepository proposalRepository;
    @Autowired
    public ProposalServiceImpl(ProposalRepository proposalRepository) {
        this.proposalRepository = proposalRepository;
    }

    @Override
    public Page<ProposalDTO> getFilteredProposal(ProposalFilter filter, Pageable pageable) {
        Specification<TbProposal> spec = ProposalSpecification.build(filter);
        return proposalRepository.findAll(spec, pageable).map(ProposalMapper::toDTO);
    }

    @Override
    public ProposalDTO createSalaryIncreaseProposal(SalaryIncreaseRequest req) {
        return null;
    }

    @Override
    public ProposalDTO createPositionChangeProposal(PositionChangeRequest req) {
        return null;
    }

    @Override
    public ProposalDTO createSkillLevelChangeProposal(SkillLevelChangeRequest req) {
        return null;
    }

    @Override
    public ProposalDTO approveProposal(Integer proposalId, Integer approverId) {
        return null;
    }

    @Override
    public ProposalDTO rejectProposal(Integer proposalId, Integer approverId, String rejectReason) {
        return null;
    }
}
