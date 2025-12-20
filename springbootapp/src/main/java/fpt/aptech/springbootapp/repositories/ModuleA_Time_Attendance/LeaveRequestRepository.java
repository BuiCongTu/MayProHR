package fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;

@Repository
public interface LeaveRequestRepository extends JpaRepository<TbLeaveRequest, Integer> {

    // ==============================
    // BASIC
    // ==============================
    Optional<TbLeaveRequest> findById(Integer id);

    // ==============================
    // ALL WITH DETAILS
    // ==============================
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department
        LEFT JOIN FETCH lr.leaveReason
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findAllWithDetails();

    // ==============================
    // BY USER
    // ==============================
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department
        LEFT JOIN FETCH lr.leaveReason
        WHERE u.id = ?1
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findByUserIdWithDetails(Integer userId);

    // ❌ OLD LOGIC (KEEP FOR OTHER FEATURES)
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department
        LEFT JOIN FETCH lr.leaveReason
        WHERE u.id = ?1
        AND lr.startDate >= ?2
        AND lr.endDate <= ?3
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findByUserIdAndDateRange(
            Integer userId,
            LocalDate fromDate,
            LocalDate toDate
    );

    // ❌ OLD LOGIC (KEEP)
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department
        LEFT JOIN FETCH lr.leaveReason
        WHERE lr.startDate >= ?1
        AND lr.endDate <= ?2
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findByDateRange(
            LocalDate fromDate,
            LocalDate toDate
    );

    // ❌ OLD LOGIC (KEEP)
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department d
        LEFT JOIN FETCH lr.leaveReason
        WHERE lr.startDate >= ?1
        AND lr.endDate <= ?2
        AND d.id = ?3
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findByDateRangeAndDepartment(
            LocalDate fromDate,
            LocalDate toDate,
            Integer departmentId
    );

    // ==============================
    // ✅ NEW – CORRECT MONTH OVERLAP LOGIC
    // ==============================
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department d
        LEFT JOIN FETCH lr.leaveReason
        WHERE d.id = :departmentId
        AND lr.startDate <= :endDate
        AND lr.endDate >= :startDate
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findOverlappingByMonthAndDepartment(
            LocalDate startDate,
            LocalDate endDate,
            Integer departmentId
    );

    // ✅ OPTIONAL (USER + MONTH)
    @Query("""
        SELECT lr FROM TbLeaveRequest lr
        JOIN FETCH lr.user u
        LEFT JOIN FETCH u.department
        LEFT JOIN FETCH lr.leaveReason
        WHERE u.id = :userId
        AND lr.startDate <= :endDate
        AND lr.endDate >= :startDate
        ORDER BY lr.createdAt DESC
    """)
    List<TbLeaveRequest> findOverlappingByMonthAndUser(
            Integer userId,
            LocalDate startDate,
            LocalDate endDate
    );
}
