package fpt.aptech.springbootapp.api.ModuleB;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.*;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalType;
import fpt.aptech.springbootapp.filter.ProposalFilter;
import fpt.aptech.springbootapp.services.interfaces.ProposalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/proposal")
public class ProposalController {

    private final ProposalService proposalService;

    @Autowired
    public ProposalController(ProposalService proposalService) {
        this.proposalService = proposalService;
    }

    @GetMapping("/salary-increase")
    public Page<ProposalDTO> getAllSalaryIncreaseProposal(ProposalFilter filter, @PageableDefault(size = 10) Pageable pageable) {
        filter.setType(ProposalType.SalaryIncrease);
        return proposalService.getFilteredProposal(filter, pageable);
    }

    @GetMapping("/position-change")
    public Page<ProposalDTO> getAllPositionChangeProposal(ProposalFilter filter, @PageableDefault(size = 10) Pageable pageable) {
        filter.setType(ProposalType.PositionChange);
        return proposalService.getFilteredProposal(filter, pageable);
    }

    @GetMapping("/skill-level")
    public Page<ProposalDTO> getAllSkillLevelProposal(ProposalFilter filter, @PageableDefault(size = 10) Pageable pageable) {
        filter.setType(ProposalType.SkillLevelChange);
        return proposalService.getFilteredProposal(filter, pageable);
    }

    @PostMapping("/salary-increase")
    public ProposalDTO createSalary(@RequestBody SalaryIncreaseRequest req) {
        return proposalService.createSalaryIncreaseProposal(req);
    }

    @PostMapping("/position-change")
    public ProposalDTO createPosition(@RequestBody PositionChangeRequest req) {
        return proposalService.createPositionChangeProposal(req);
    }

    @PostMapping("/skill-level")
    public ProposalDTO createSkill(@RequestBody SkillLevelChangeRequest req) {
        return proposalService.createSkillLevelChangeProposal(req);
    }

    @PutMapping("/{id}/approve")
    public ProposalDTO approve(@PathVariable("id") Integer id, @RequestParam("approverId") Integer approverId) {
        return proposalService.approveProposal(id, approverId);
    }

    @PutMapping("/{id}/reject")
    public ProposalDTO reject(@PathVariable("id") Integer id, @RequestBody RejectRequest req) {
        return proposalService.rejectProposal(id, req.getApproverId(), req.getReason());
    }
}
