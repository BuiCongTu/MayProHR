package fpt.aptech.springbootapp.mappers.ModuleB;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.*;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal;
import fpt.aptech.springbootapp.entities.Core.TbUser;

import java.time.Instant;

public class ProposalMapper {


    public static ProposalDTO toDTO(TbProposal p) {
        if (p == null) return null;

        ProposalDTO dto = new ProposalDTO();
        dto.setId(p.getId());
        dto.setType(p.getType());

        // proposer
        if (p.getProposer() != null) {
            dto.setProposerId(p.getProposer().getId());
            dto.setProposerName(p.getProposer().getFullName());
        }

        // target user
        if (p.getTargetUser() != null) {
            dto.setTargetUserId(p.getTargetUser().getId());
            dto.setTargetUserName(p.getTargetUser().getFullName());
        }

        dto.setDetails(p.getDetails());
        dto.setReason(p.getReason());
        dto.setStatus(p.getStatus());

        // approved-by
        if (p.getApprovedBy() != null) {
            dto.setApprovedById(p.getApprovedBy().getId());
            dto.setApprovedByName(p.getApprovedBy().getFullName());
        }

        dto.setRejectReason(p.getRejectReason());

        dto.setCreatedAt(p.getCreatedAt() != null ? p.getCreatedAt() : Instant.now());

        return dto;
    }




    public static TbProposal fromSalaryRequest(SalaryIncreaseRequest req, TbUser proposer, TbUser target) {
        TbProposal p = new TbProposal();
        p.setType(TbProposal.ProposalType.SalaryIncrease);
        p.setProposer(proposer);
        p.setTargetUser(target);
        String details = String.format("{\"increase\": %d}", req.getIncreaseAmount());
        p.setDetails(details);
        p.setReason(req.getReason());
        p.setStatus(TbProposal.ProposalStatus.pending);
        return p;
    }

    public static TbProposal fromPositionRequest(PositionChangeRequest req, TbUser proposer, TbUser target) {
        TbProposal p = new TbProposal();
        p.setType(TbProposal.ProposalType.PositionChange);
        p.setProposer(proposer);
        p.setTargetUser(target);

        String details = String.format(
                "{\"new_role_id\": %d, \"new_department_id\": %d, \"new_salary\": %s, \"new_salary_type\": %s, \"new_line_id\": %s, \"new_sub_line_id\": %s, \"new_work_unit_id\": %s}",
                req.getNewRoleId(),
                req.getNewDepartmentId(),
                req.getNewSalary() == null ? "null" : req.getNewSalary().toString(),
                req.getSalaryType() == null ? "null" : ("\"" + req.getSalaryType() + "\""),
                req.getLineId() == null ? "null" : req.getLineId().toString(),
                req.getSubLineId() == null ? "null" : req.getSubLineId().toString(),
                req.getWorkUnitId() == null ? "null" : req.getWorkUnitId().toString()
        );

        p.setDetails(details);
        p.setReason(req.getReason());
        p.setStatus(TbProposal.ProposalStatus.pending);
        return p;
    }


    public static TbProposal fromSkillRequest(SkillLevelChangeRequest req, TbUser proposer, TbUser target) {
        TbProposal p = new TbProposal();
        p.setType(TbProposal.ProposalType.SkillLevelChange);
        p.setProposer(proposer);
        p.setTargetUser(target);
        String details = String.format("{\"new_skill_level_id\": %d}", req.getNewSkillLevelId());
        p.setDetails(details);
        p.setReason(req.getReason());
        p.setStatus(TbProposal.ProposalStatus.pending);
        return p;
    }
}
