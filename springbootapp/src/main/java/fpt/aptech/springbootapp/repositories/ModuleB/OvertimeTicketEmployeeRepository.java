package fpt.aptech.springbootapp.repositories.ModuleB;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface OvertimeTicketEmployeeRepository extends JpaRepository<TbOvertimeTicketEmployee, Long> {

    @Query("SELECT te FROM TbOvertimeTicketEmployee te " +
            "JOIN FETCH te.overtimeTicket t " +
            "JOIN FETCH t.overtimeRequest r " +
            "WHERE te.employee.id = :userId " +
            "ORDER BY r.overtimeDate DESC")
    List<TbOvertimeTicketEmployee> findByEmployeeId(Integer userId);

    @Query("SELECT te FROM TbOvertimeTicketEmployee te " +
            "WHERE te.overtimeTicket.id = :ticketId AND te.employee.id = :userId")
    TbOvertimeTicketEmployee findByTicketAndEmployee(Integer ticketId, Integer userId);

    List<TbOvertimeTicketEmployee> findByEmployeeAndStatusAndTicketDateBetween(
            TbUser user,
            TbOvertimeTicketEmployee.EmployeeOvertimeStatus employeeOvertimeStatus,
            LocalDate startDate,
            LocalDate endDate);
}