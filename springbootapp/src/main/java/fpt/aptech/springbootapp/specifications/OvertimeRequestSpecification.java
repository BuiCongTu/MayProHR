package fpt.aptech.springbootapp.specifications;

import fpt.aptech.springbootapp.filter.OvertimeRequestFilter;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

public class OvertimeRequestSpecification {

    public static Specification<TbOvertimeRequest> build(OvertimeRequestFilter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter.getFactoryManagerId() != null) {
                predicates.add(cb.equal(root.get("factoryManager").get("id"), filter.getFactoryManagerId()));
            }

            if(filter.getFactoryManagerName() != null){
                predicates.add(cb.like(root.get("factoryManager").get("fullName"), "%" + filter.getFactoryManagerName() + "%"));
            }

            if (filter.getDepartmentId() != null) {
                predicates.add(cb.equal(root.get("department").get("id"), filter.getDepartmentId()));
            }

            if(filter.getDepartmentName() != null){
                predicates.add(cb.like(root.get("department").get("name"), "%" + filter.getDepartmentName() + "%"));
            }

            if(filter.getOvertimeTime() != null){
                predicates.add(cb.equal(root.get("overtimeTime"), filter.getOvertimeTime()));
            }

            if (filter.getOvertimeDate() != null) {
                predicates.add(cb.equal(root.get("overtimeDate"), filter.getOvertimeDate()));
            }

            if (filter.getOvertimeDateStart() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("overtimeDate"), filter.getOvertimeDateStart()));
            }

            if (filter.getOvertimeDateEnd() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("overtimeDate"), filter.getOvertimeDateEnd()));
            }

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(root.get("status"), filter.getStatus()));
            }

            if (filter.getAllowedStatuses() != null && !filter.getAllowedStatuses().isEmpty()) {
                predicates.add(root.get("status").in(filter.getAllowedStatuses()));
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
