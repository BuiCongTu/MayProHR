package fpt.aptech.springbootapp.specifications;

import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket;
import fpt.aptech.springbootapp.filter.OvertimeTicketFilter;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class OvertimeTicketSpecification {

    public static Specification<TbOvertimeTicket> build(OvertimeTicketFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getManagerId() != null) {
                predicates.add(cb.equal(root.get("manager").get("id"), filter.getManagerId()));
            }

            if (filter.getManagerName() != null) {
                predicates.add(cb.like(root.get("manager").get("fullName"), "%" + filter.getManagerName() + "%"));
            }

            if (filter.getRequestId() != null) {
                predicates.add(cb.equal(root.get("overtimeRequest").get("id"), filter.getRequestId()));
            }

            if (filter.getRequesterName() != null) {
                predicates.add(cb.like(root.get("overtimeRequest").get("factoryManager").get("fullName"), "%" + filter.getRequesterName() + "%"));
            }

            if (filter.getOvertimeDate() != null) {
                predicates.add(cb.equal(root.get("overtimeRequest").get("overtimeDate"), filter.getOvertimeDate()));
            }

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            if (filter.getAllowedStatuses() != null && !filter.getAllowedStatuses().isEmpty()) {
                predicates.add(root.get("status").in(filter.getAllowedStatuses()));
            }

            if (filter.getConfirmedById() != null) {
                predicates.add(cb.equal(root.get("confirmedBy").get("id"), filter.getConfirmedById()));
            }

            if (filter.getConfirmedByName() != null) {
                predicates.add(cb.like(root.get("confirmedBy").get("fullName"), "%" + filter.getConfirmedByName() + "%"));
            }

            if (filter.getApprovedById() != null) {
                predicates.add(cb.equal(root.get("approvedBy").get("id"), filter.getApprovedById()));
            }

            if (filter.getApprovedByName() != null) {
                predicates.add(cb.like(root.get("approvedBy").get("fullName"), "%" + filter.getApprovedByName() + "%"));
            }

            if (filter.getCreatedAfter() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), filter.getCreatedAfter()));
            }

            if (filter.getCreatedBefore() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), filter.getCreatedBefore()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
