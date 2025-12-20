package fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance;

import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LeaveReasonRepository extends JpaRepository<TbLeaveReason, Integer> {

}

