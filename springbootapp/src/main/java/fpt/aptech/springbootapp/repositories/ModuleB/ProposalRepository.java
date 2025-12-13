package fpt.aptech.springbootapp.repositories.ModuleB;

import fpt.aptech.springbootapp.entities.ModuleB.TbProposal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ProposalRepository extends JpaRepository<TbProposal, Integer>,
        JpaSpecificationExecutor<TbProposal> {
    Page<TbProposal> findByType(TbProposal.ProposalType type, Pageable pageable);

    // for check 12 months: latest salary-increase for user
    Optional<TbProposal> findFirstByTargetUserIdAndTypeOrderByCreatedAtDesc(Integer targetUserId, TbProposal.ProposalType type);
}
