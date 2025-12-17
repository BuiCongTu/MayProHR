package fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance;

import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;

@Repository
public interface LeaveRequestRepository extends JpaRepository<TbLeaveRequest, Integer> {
    Optional<TbLeaveRequest> findById(Integer userId);
    @Query("SELECT lr FROM TbLeaveRequest lr " +
            "JOIN FETCH lr.user u " +
            "LEFT JOIN FETCH u.department " +
            "LEFT JOIN FETCH lr.leaveReason " +
            "ORDER BY lr.createdAt DESC")
    List<TbLeaveRequest> findAllWithDetails();

    @Query("SELECT lr FROM TbLeaveRequest lr " +
            "JOIN FETCH lr.user u " +
            "LEFT JOIN FETCH u.department " +
            "LEFT JOIN FETCH lr.leaveReason " +
            "WHERE u.id = ?1 " +
            "ORDER BY lr.createdAt DESC")
    List<TbLeaveRequest> findByUserIdWithDetails(Integer userId);

    @Query("SELECT lr FROM TbLeaveRequest lr " +
            "JOIN FETCH lr.user u " +
            "LEFT JOIN FETCH u.department " +
            "LEFT JOIN FETCH lr.leaveReason " +
            "WHERE u.id = ?1 AND lr.startDate >= ?2 AND lr.endDate <= ?3 " +
            "ORDER BY lr.createdAt DESC")
    List<TbLeaveRequest> findByUserIdAndDateRange(Integer userId, LocalDate fromDate, LocalDate toDate);

    @Query("SELECT lr FROM TbLeaveRequest lr " +
            "JOIN FETCH lr.user u " +
            "LEFT JOIN FETCH u.department " +
            "LEFT JOIN FETCH lr.leaveReason " +
            "WHERE lr.startDate >= ?1 AND lr.endDate <= ?2 " +
            "ORDER BY lr.createdAt DESC")
    List<TbLeaveRequest> findByDateRange(LocalDate fromDate, LocalDate toDate);

    @Query("SELECT lr FROM TbLeaveRequest lr " +
            "JOIN FETCH lr.user u " +
            "LEFT JOIN FETCH u.department d " +
            "LEFT JOIN FETCH lr.leaveReason " +
            "WHERE lr.startDate >= ?1 AND lr.endDate <= ?2 AND d.id = ?3 " +
            "ORDER BY lr.createdAt DESC")
    List<TbLeaveRequest> findByDateRangeAndDepartment(LocalDate fromDate, LocalDate toDate, Integer departmentId);
}
