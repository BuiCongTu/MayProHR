package fpt.aptech.springbootapp.repositories.ModuleD_Leave;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface LeaveRequestRepo extends JpaRepository<TbLeaveRequest, Integer> {
    List<TbLeaveRequest> findByUserAndStatusAndStartDateBetween(
            TbUser user,
            String name,
            LocalDate startDate,
            LocalDate endDate);
}
