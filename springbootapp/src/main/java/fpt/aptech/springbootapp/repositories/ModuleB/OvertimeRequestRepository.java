package fpt.aptech.springbootapp.repositories.ModuleB;

import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface OvertimeRequestRepository extends JpaRepository<TbOvertimeRequest, Integer>,
        JpaSpecificationExecutor<TbOvertimeRequest>
{
    @Query(value = """
        SELECT * FROM tbOvertimeRequest 
        WHERE status = 'open' 
        AND (
            overtime_date < :today 
            OR 
            (overtime_date = :today AND end_time <= CAST(:now AS TIME))
        )
        """, nativeQuery = true)
    List<TbOvertimeRequest> findFinishedRequests(
            @Param("today") LocalDate today,
            @Param("now") LocalTime now
    );

    @Query(value = """
        SELECT * FROM tbOvertimeRequest 
        WHERE status = 'pending' 
        AND (
            overtime_date < :today 
            OR 
            (overtime_date = :today AND start_time < CAST(:now AS TIME))
        )
        """, nativeQuery = true)
    List<TbOvertimeRequest> findExpiredPendingRequests(
            @Param("today") LocalDate today,
            @Param("now") LocalTime now
    );
}
