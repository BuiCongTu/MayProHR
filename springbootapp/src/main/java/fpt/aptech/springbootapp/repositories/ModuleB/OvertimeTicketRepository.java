package fpt.aptech.springbootapp.repositories.ModuleB;

import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface OvertimeTicketRepository extends JpaRepository<TbOvertimeTicket, Integer>,
        JpaSpecificationExecutor<TbOvertimeTicket>
{
    @Query("SELECT CASE WHEN COUNT(ote) > 0 THEN true ELSE false END " +
            "FROM TbOvertimeTicketEmployee ote " +
            "WHERE ote.overtimeTicket.overtimeRequest.id = :requestId " +
            "AND ote.line.id = :lineId " +
            "AND ote.overtimeTicket.status != 'rejected'")
    boolean existsByRequestIdAndLineId(@Param("requestId") Integer requestId, @Param("lineId") Integer lineId);

    @Query("SELECT CASE WHEN COUNT(ote) > 0 THEN true ELSE false END " +
            "FROM TbOvertimeTicketEmployee ote " +
            "WHERE ote.overtimeTicket.overtimeRequest.id = :requestId " +
            "AND ote.employee.id = :employeeId " +
            "AND ote.status = 'accepted' " +
            "AND ote.overtimeTicket.status != 'rejected'")
    boolean isEmployeeWorkingInRequest(@Param("requestId") Integer requestId, @Param("employeeId") Integer employeeId);

    @Query("SELECT COUNT(ote) FROM TbOvertimeTicketEmployee ote " +
            "WHERE ote.overtimeTicket.overtimeRequest.id = :requestId " +
            "AND ote.line.id = :lineId " +
            "AND ote.overtimeTicket.status != 'rejected' " +
            "AND ote.status != 'rejected' ")
    long countAssignedEmployeesByLine(@Param("requestId") Integer requestId,
                                      @Param("lineId") Integer lineId);

    @Query(value = "SELECT CASE WHEN COUNT(ote.id) > 0 THEN 1 ELSE 0 END " +
            "FROM tb_overtime_ticket_employees ote " +
            "JOIN tbOvertimeTicket t ON ote.overtime_ticket_id = t.ticket_id " +
            "JOIN tbOvertimeRequest r ON t.request_id = r.request_id " +
            "WHERE ote.user_id = :employeeId " +
            "AND r.overtime_date = :date " +
            "AND t.status != 'rejected' " +
            "AND ote.status = 'accepted' " +
            "AND (r.start_time < CAST(:endTime AS TIME) AND r.end_time > CAST(:startTime AS TIME))",
            nativeQuery = true)
    int existsGlobalTimeConflict(@Param("employeeId") Integer employeeId,
                                 @Param("date") LocalDate date,
                                 @Param("startTime") LocalTime startTime,
                                 @Param("endTime") LocalTime endTime);

    @Query("SELECT COALESCE(SUM(r.overtimeTime), 0) FROM TbOvertimeTicketEmployee ote " +
            "JOIN ote.overtimeTicket t " +
            "JOIN t.overtimeRequest r " +
            "WHERE ote.employee.id = :employeeId " +
            "AND r.overtimeDate BETWEEN :startDate AND :endDate " +
            "AND t.status != 'rejected' " +
            "AND ote.status != 'rejected'")
    Double getWeeklyOvertimeHours(@Param("employeeId") Integer employeeId,
                                  @Param("startDate") LocalDate startDate,
                                  @Param("endDate") LocalDate endDate);

    @Query(value = """
        SELECT t.* FROM tbOvertimeTicket t
        INNER JOIN tbOvertimeRequest r ON t.request_id = r.request_id
        WHERE t.status = 'submitted'
          AND (
              r.overtime_date < :date
              OR 
              (r.overtime_date = :date AND r.start_time <= CAST(:cutoffTime AS TIME))
          )
        """, nativeQuery = true)
    List<TbOvertimeTicket> findSubmittedTicketsNearStart(
            @Param("date") LocalDate date,
            @Param("cutoffTime") LocalTime cutoffTime
    );

    @Query("SELECT COUNT(ote) FROM TbOvertimeTicketEmployee ote " +
            "WHERE ote.overtimeTicket.overtimeRequest.id = :requestId " +
            "AND ote.line.id = :lineId " +
            "AND ote.overtimeTicket.status != 'rejected' " +
            "AND ote.status = 'accepted' ")
    long countAcceptedEmployeesByLine(@Param("requestId") Integer requestId,
                                      @Param("lineId") Integer lineId);
}