package fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance;

import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public interface LeaveRequestRepository extends JpaRepository<TbLeaveRequest, Integer> {
    Optional<TbLeaveRequest> findById(Integer userId);
}
