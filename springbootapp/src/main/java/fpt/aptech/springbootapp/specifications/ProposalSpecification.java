package fpt.aptech.springbootapp.specifications;

import fpt.aptech.springbootapp.entities.ModuleB.TbProposal;
import fpt.aptech.springbootapp.filter.ProposalFilter;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;

public class ProposalSpecification {
    public static Specification<TbProposal> build(ProposalFilter filter) {
        return (root, query, cb) -> {
            // fetch associations to avoid N+1
            root.fetch("proposer", JoinType.LEFT);
            root.fetch("targetUser", JoinType.LEFT);
            root.fetch("approvedBy", JoinType.LEFT);
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();
            if (filter.getId() != null) predicates.add(cb.equal(root.get("id"), filter.getId()));
            if (filter.getType() != null) predicates.add(cb.equal(root.get("type"), filter.getType()));
            if (filter.getProposerId() != null) predicates.add(cb.equal(root.get("proposer").get("id"), filter.getProposerId()));
            if (filter.getTargetUserId() != null) predicates.add(cb.equal(root.get("targetUser").get("id"), filter.getTargetUserId()));
            if (filter.getStatus() != null) predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            if (filter.getApprovedById() != null) predicates.add(cb.equal(root.get("approvedBy").get("id"), filter.getApprovedById()));

            // --- NEW: year/month filter in UTC (range query, endExclusive) ---
            Integer year = filter.getYear();
            Integer month = filter.getMonth();

            if (year != null && month != null) {
                if (month < 1 || month > 12) {
                    throw new IllegalArgumentException("month must be between 1 and 12");
                }

                Instant start = ZonedDateTime.of(year, month, 1, 0, 0, 0, 0, ZoneOffset.UTC).toInstant();
                Instant endExclusive = ZonedDateTime.of(year, month, 1, 0, 0, 0, 0, ZoneOffset.UTC)
                        .plusMonths(1)
                        .toInstant();

                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
                predicates.add(cb.lessThan(root.get("createdAt"), endExclusive));
            } else if (year != null && month == null) {
                Instant start = ZonedDateTime.of(year, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC).toInstant();
                Instant endExclusive = ZonedDateTime.of(year, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)
                        .plusYears(1)
                        .toInstant();

                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), start));
                predicates.add(cb.lessThan(root.get("createdAt"), endExclusive));
            }

            // keep existing createdAfter/createdBefore filters (if you still use them somewhere)
            if (filter.getCreatedAfter() != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getCreatedAfter()));
            if (filter.getCreatedBefore() != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.getCreatedBefore()));

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}

