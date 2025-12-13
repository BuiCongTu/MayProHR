package fpt.aptech.springbootapp.repositories.ModuleB;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
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

    //not used
    List<TbOvertimeTicketEmployee> findByEmployeeAndStatusAndTicketDateBetween(
            TbUser user,
            TbOvertimeTicketEmployee.EmployeeOvertimeStatus employeeOvertimeStatus,
            LocalDate startDate,
            LocalDate endDate);

    @Query(value = """
        SELECT e.* FROM tbOvertimeTicketEmployee e
        INNER JOIN tbOvertimeTicket t ON e.ticket_id = t.ticket_id
        INNER JOIN tbOvertimeRequest r ON t.request_id = r.request_id
        WHERE e.status = 'pending'
          AND r.overtime_date = :date
          AND r.start_time <= CAST(:cutoffTime AS TIME)
        """, nativeQuery = true)
    List<TbOvertimeTicketEmployee> findPendingEmployeesNearStart(
            @Param("date") LocalDate date,
            @Param("cutoffTime") LocalTime cutoffTime
    );
}