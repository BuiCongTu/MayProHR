package fpt.aptech.springbootapp.api.ModuleB;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.PositionChangeRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.RejectRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SalaryIncreaseRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SkillLevelChangeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal.ProposalType;
import fpt.aptech.springbootapp.filter.ProposalFilter;
import fpt.aptech.springbootapp.services.interfaces.ProposalService;

@RestController
@RequestMapping("/api/proposal")
public class ProposalController {

    private final ProposalService proposalService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public ProposalController(ProposalService proposalService, SimpMessagingTemplate messagingTemplate) {
        this.proposalService = proposalService;
        this.messagingTemplate = messagingTemplate;
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
        ProposalDTO dto = proposalService.createSalaryIncreaseProposal(req);
        messagingTemplate.convertAndSend("/topic/proposals", dto); // realtime update
        return dto;
    }

    @PostMapping("/position-change")
    public ProposalDTO createPosition(@RequestBody PositionChangeRequest req) {
        ProposalDTO dto = proposalService.createPositionChangeProposal(req);
        messagingTemplate.convertAndSend("/topic/proposals", dto);
        return dto;
    }

    @PostMapping("/skill-level")
    public ProposalDTO createSkill(@RequestBody SkillLevelChangeRequest req) {
        ProposalDTO dto = proposalService.createSkillLevelChangeProposal(req);
        messagingTemplate.convertAndSend("/topic/proposals", dto);
        return dto;
    }

    @PutMapping("/{id}/approve")
    public ProposalDTO approve(@PathVariable("id") Integer id, @RequestParam("approverId") Integer approverId) {
        ProposalDTO dto = proposalService.approveProposal(id, approverId);
        messagingTemplate.convertAndSend("/topic/proposals", dto);
        return dto;
    }

    @PutMapping("/{id}/reject")
    public ProposalDTO reject(@PathVariable("id") Integer id, @RequestBody RejectRequest req) {
        ProposalDTO dto = proposalService.rejectProposal(id, req.getApproverId(), req.getReason());
        messagingTemplate.convertAndSend("/topic/proposals", dto);
        return dto;
    }
}
