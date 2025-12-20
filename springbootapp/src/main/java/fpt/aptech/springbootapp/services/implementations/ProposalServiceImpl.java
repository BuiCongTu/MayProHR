package fpt.aptech.springbootapp.services.implementations;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import fpt.aptech.springbootapp.dtos.ModuleB.ProposalDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.PositionChangeRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SalaryIncreaseRequest;
import fpt.aptech.springbootapp.dtos.ModuleB.requests.SkillLevelChangeRequest;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbProposal;
import fpt.aptech.springbootapp.mappers.ModuleB.ProposalMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.ProposalRepository;
import fpt.aptech.springbootapp.repositories.RoleRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.interfaces.ProposalService;
import fpt.aptech.springbootapp.specifications.ProposalSpecification;

@Service
public class ProposalServiceImpl implements ProposalService {

    private final ProposalRepository proposalRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public ProposalServiceImpl(
            ProposalRepository proposalRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            DepartmentRepository departmentRepository,
            ObjectMapper objectMapper
    ) {
        this.proposalRepository = proposalRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.departmentRepository = departmentRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Page<ProposalDTO> getFilteredProposal(fpt.aptech.springbootapp.filter.ProposalFilter filter, Pageable pageable) {
        var spec = ProposalSpecification.build(filter);
        return proposalRepository.findAll(spec, pageable).map(fpt.aptech.springbootapp.mappers.ModuleB.ProposalMapper::toDTO);
    }

    // ---------- CREATE Salary ----------
    @Override
    @Transactional
    public ProposalDTO createSalaryIncreaseProposal(SalaryIncreaseRequest req) {
        if (req.getIncreaseAmount() == null || req.getIncreaseAmount() <= 0) {
            throw new RuntimeException("Invalid increase amount");
        }

        TbUser targetUser = userRepository.findById(req.getTargetUserId())
                .orElseThrow(() -> new RuntimeException("Target employee not found"));

        BigDecimal currentSalary = targetUser.getBaseSalary() != null ? targetUser.getBaseSalary() : BigDecimal.ZERO;
        BigDecimal increaseAmount = BigDecimal.valueOf(req.getIncreaseAmount());

        // Check new salary > current salary
        if (increaseAmount.compareTo(BigDecimal.ZERO) <= 0
                || currentSalary.add(increaseAmount).compareTo(currentSalary) <= 0) {
            throw new RuntimeException("Invalid increase amount");
        }

        TbProposal proposal = new TbProposal();
        proposal.setProposer(userRepository.findById(req.getProposerId()).orElseThrow());
        proposal.setTargetUser(targetUser);
        String details = String.format("{\"increase\": %d}", req.getIncreaseAmount());
        proposal.setDetails(details);
        proposal.setReason(req.getReason());
        proposal.setType(TbProposal.ProposalType.SalaryIncrease);
        proposal.setStatus(TbProposal.ProposalStatus.pending);
        proposal.setCreatedAt(Instant.now());

        proposalRepository.save(proposal);
        return ProposalMapper.toDTO(proposal);
    }

    // ---------- CREATE Position ----------
    @Override
    @Transactional
    public ProposalDTO createPositionChangeProposal(PositionChangeRequest req) {
        TbUser proposer = userRepository.findById(req.getProposerId()).orElseThrow();
        TbUser target = userRepository.findById(req.getTargetUserId()).orElseThrow();

        // validate role and department exist
        roleRepository.findById(req.getNewRoleId()).orElseThrow(() -> new IllegalArgumentException("Role not found"));
        departmentRepository.findById(req.getNewDepartmentId()).orElseThrow(() -> new IllegalArgumentException("Department not found"));

        TbProposal p = ProposalMapper.fromPositionRequest(req, proposer, target);
        proposalRepository.save(p);
        return ProposalMapper.toDTO(p);
    }

    // ---------- CREATE Skill ----------
    @Override
    @Transactional
    public ProposalDTO createSkillLevelChangeProposal(SkillLevelChangeRequest req) {
        TbUser proposer = userRepository.findById(req.getProposerId()).orElseThrow();
        TbUser target = userRepository.findById(req.getTargetUserId()).orElseThrow();

        // Note: assume SkillLevel repo exists; validate separately if needed
        TbProposal p = ProposalMapper.fromSkillRequest(req, proposer, target);
        proposalRepository.save(p);
        return ProposalMapper.toDTO(p);
    }

    // ---------- APPROVE ----------
    @Override
    @Transactional
    public ProposalDTO approveProposal(Integer proposalId, Integer approverId) {
        TbProposal p = proposalRepository.findById(proposalId).orElseThrow(() -> new IllegalArgumentException("Proposal not found"));
        TbUser approver = userRepository.findById(approverId).orElseThrow(() -> new IllegalArgumentException("Approver not found"));

        if (p.getStatus() != TbProposal.ProposalStatus.pending && p.getStatus() != TbProposal.ProposalStatus.confirmed) {
            throw new IllegalStateException("Only pending/confirmed proposals can be approved");
        }

        p.setStatus(TbProposal.ProposalStatus.approved);
        p.setApprovedBy(approver);
        proposalRepository.save(p);

        // apply side-effects
        applyApprovedEffects(p);

        return ProposalMapper.toDTO(p);
    }

    // ---------- REJECT ----------
    @Override
    @Transactional
    public ProposalDTO rejectProposal(Integer proposalId, Integer approverId, String rejectReason) {
        TbProposal p = proposalRepository.findById(proposalId).orElseThrow(() -> new IllegalArgumentException("Proposal not found"));
        TbUser approver = userRepository.findById(approverId).orElseThrow(() -> new IllegalArgumentException("Approver not found"));

        if (p.getStatus() != TbProposal.ProposalStatus.pending && p.getStatus() != TbProposal.ProposalStatus.confirmed) {
            throw new IllegalStateException("Only pending/confirmed proposals can be rejected");
        }

        p.setStatus(TbProposal.ProposalStatus.rejected);
        p.setApprovedBy(approver);
        p.setRejectReason(rejectReason);
        proposalRepository.save(p);

        // TODO: send notification (notificationService.notify(...))
        return ProposalMapper.toDTO(p);
    }

    // ---------- helpers ----------
    private void validateIncreaseByRole(TbUser target, Integer increase) {
        if (increase == null || increase <= 0) {
            throw new IllegalArgumentException("Invalid increase amount");
        }
        // example rule mapping (adjust values to your business):
        String roleName = target.getRole() != null ? target.getRole().getName() : "Worker";
        int min;
        switch (roleName) {
            case "Factory Director":
                min = 500000;
                break;
            case "Factory Manager":
                min = 400000;
                break;
            case "Manager":
                min = 300000;
                break;
            case "Leader":
            case "Assistant Leader":
                min = 250000;
                break;
            default:
                min = 200000;
        }
        if (increase < min) {
            throw new IllegalArgumentException("Increase amount is below allowed minimum for role");
        }
    }

    private void applyApprovedEffects(TbProposal p) {
        try {
            if (p.getType() == TbProposal.ProposalType.SalaryIncrease) {
                // parse details JSON and update user's baseSalary
                Map<String, Object> details = objectMapper.readValue(p.getDetails(), Map.class);
                Object inc = details.get("increase");
                if (inc != null) {
                    Integer increase = (inc instanceof Number) ? ((Number) inc).intValue() : Integer.parseInt(inc.toString());
                    TbUser target = p.getTargetUser();
                    if (target.getBaseSalary() == null) {
                        target.setBaseSalary(java.math.BigDecimal.ZERO);
                    }
                    target.setBaseSalary(target.getBaseSalary().add(java.math.BigDecimal.valueOf(increase)));
                    userRepository.save(target);

                    // TODO: call payroll API to update (POST /payroll/update-user)
                }
                // TODO: send notification to HR/payroll
            } else if (p.getType() == TbProposal.ProposalType.PositionChange) {
                Map<String, Object> details = objectMapper.readValue(p.getDetails(), Map.class);
                Object roleIdObj = details.get("new_role_id");
                Object deptIdObj = details.get("new_department_id");
                Object newSalaryObj = details.get("new_salary");

                TbUser target = p.getTargetUser();
                if (roleIdObj != null) {
                    Integer roleId = (roleIdObj instanceof Number) ? ((Number) roleIdObj).intValue() : Integer.parseInt(roleIdObj.toString());
                    roleRepository.findById(roleId).ifPresent(r -> target.setRole(r));
                }
                if (deptIdObj != null) {
                    Integer deptId = (deptIdObj instanceof Number) ? ((Number) deptIdObj).intValue() : Integer.parseInt(deptIdObj.toString());
                    departmentRepository.findById(deptId).ifPresent(d -> target.setDepartment(d));
                }
                if (newSalaryObj != null && !"null".equals(newSalaryObj.toString())) {
                    Integer newSalary = (newSalaryObj instanceof Number) ? ((Number) newSalaryObj).intValue() : Integer.parseInt(newSalaryObj.toString());
                    target.setBaseSalary(java.math.BigDecimal.valueOf(newSalary));
                }
                userRepository.save(target);
                // TODO: notify payroll & HR
            } else if (p.getType() == TbProposal.ProposalType.SkillLevelChange) {
                // when skill-level approved, automatically create a salary proposal (business rule)
                // parse details to get new skill level id, compute increase amount as business rule
                Map<String, Object> details = objectMapper.readValue(p.getDetails(), Map.class);
                // example: newSkill => automatic increase 200k (you can compute)
                int autoIncrease = 200000;
                SalaryIncreaseRequest req = new SalaryIncreaseRequest();
                req.setProposerId(p.getApprovedBy().getId());
                req.setTargetUserId(p.getTargetUser().getId());
                req.setIncreaseAmount(autoIncrease);
                req.setReason("Auto-generated salary increase after skill-level upgrade");
                // create and save automatically - mark as pending so director can approve
                TbProposal auto = ProposalMapper.fromSalaryRequest(req, p.getApprovedBy(), p.getTargetUser());
                proposalRepository.save(auto);
                // TODO: notify director/Hr about auto-created salary proposal
            }
        } catch (Exception ex) {
            // log error
            ex.printStackTrace();
        }
    }
}
