package fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import fpt.aptech.springbootapp.entities.ModuleA.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;

@Repository
public interface AttendanceRepository extends JpaRepository<TbAttendance, Long> {
//1. tim attendance cua user trong ngay

    Optional<TbAttendance> findByUserAndDate(TbUser user, LocalDate date);

    //2. tim attendance cua user theo id va ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.user.id = :userId AND a.date = :date")
    Optional<TbAttendance> findByUserIdAndDate(
            @Param("userId") Integer userId,
            @Param("date") LocalDate date
    );

    //3.lay all attendance cuar user theo user
    List<TbAttendance> findByUser(TbUser user);

    //4. lay all attend cua user theo userid
    @Query("SELECT a FROM TbAttendance a WHERE a.user.id = :userId ORDER BY a.date DESC")
    List<TbAttendance> findByUserId(@Param("userId") Integer userId);

    //5 lay trong khoang ngay deens ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<TbAttendance> findByDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    //6. lay all atteend cua 1 ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.date = :date ORDER BY a.user.id")
    List<TbAttendance> findByDate(@Param("date") LocalDate date);

    //7 lay tat ca theo status
    List<TbAttendance> findByStatus(AttendanceStatus status);

    //8. lay attend cua user voi status trong ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.user.id = :userId AND a.date = :date AND a.status = :status")
    Optional<TbAttendance> findByUserIdAndDateAndStatus(
            @Param("userId") Integer userId,
            @Param("date") LocalDate date,
            @Param("status") AttendanceStatus status
    );

    //9. kiem tra user da check in hnay chua
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM TbAttendance a WHERE a.user.id = :userId AND a.date = :date AND a.timeIn IS NOT NULL")
    boolean hasCheckedInToday(
            @Param("userId") Integer userId,
            @Param("date") LocalDate date
    );

    //10. kiem tra user da check out hnay chua
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM TbAttendance a WHERE a.user.id = :userId AND a.date = :date AND a.timeOut IS NOT NULL")
    boolean hasCheckedOutToday(@Param("userId") Integer userId,
            @Param("date") LocalDate date);

    //11 lay attendance cua user va department trong ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.date = :date AND a.user.department.id = :departmentId ORDER BY a.user.id")
    List<TbAttendance> findByDateAndDepartment(
            @Param("date") LocalDate date,
            @Param("departmentId") Integer departmentId
    );

    //12. lay attendance cua user va line trong ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.date = :date AND a.user.line.id = :lineId ORDER BY a.user.id")
    List<TbAttendance> findByDateAndLine(
            @Param("date") LocalDate date,
            @Param("lineId") Integer lineId
    );

    //13. dem attendance thah cong cua dep trong ngay
    @Query("SELECT COUNT(a) FROM TbAttendance a WHERE a.date = :date AND a.user.department.id = :departmentId AND a.status = 'SUCCESS'")
    long countSuccessAttendanceByDateAndDepartment(
            @Param("date") LocalDate date,
            @Param("departmentId") Integer departmentId
    );

    //14. lay attendance chua duoc update lan cuoi
    @Query("SELECT a FROM TbAttendance a WHERE a.timeOut IS NULL ORDER BY a.date DESC")
    List<TbAttendance> findUnupdatedAttendance();

    //15.lay attendance duoc update thu cong
    @Query("SELECT a FROM TbAttendance a WHERE a.date = :date AND a.status = 'MANUAL' AND a.manualUpdatedBy.id = :updatedByUserId ORDER BY a.date DESC")
    List<TbAttendance> findManualAttendanceByDateAndUpdatedBy(
            @Param("date") LocalDate date,
            @Param("updatedByUserId") Integer updatedByUserId
    );

    //16. lay attendance di muon trong ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.date = :date AND a.status = 'LATE' ORDER BY a.user.id")
    List<TbAttendance> findLateAttendanceByDate(@Param("date") LocalDate date);

    // 17. kiem tra user co attendance nao chua
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM TbAttendance a WHERE a.user.id = :userId")
    boolean hasAnyAttendanceRecord(@Param("userId") Integer userId);

    // 18. lay attendance cua user trong khoang ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.user = :user AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC")
    List<TbAttendance> findByUserAndDateBetween(
            @Param("user") TbUser user,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    // 19. lay attendance cua department trong ngay
    @Query("SELECT a FROM TbAttendance a WHERE a.user.department.id = :departmentId AND a.date = :date ORDER BY a.user.id")
    List<TbAttendance> findByUserDepartmentIdAndDate(
            @Param("departmentId") Integer departmentId,
            @Param("date") LocalDate date
    );

    @Query("SELECT a FROM TbAttendance a WHERE a.user = :user AND a.date BETWEEN :startDate AND :endDate AND a.status = :attendanceStatus ORDER BY a.date DESC")
    List<TbAttendance> findByUserAndDateBetweenAndStatus(TbUser user, LocalDate startDate, LocalDate endDate, AttendanceStatus attendanceStatus);

    @Query(value = "SELECT * FROM tbAttendance WHERE DATE BETWEEN :startDate AND :endDate ORDER BY DATE DESC", nativeQuery = true)
    java.util.List<TbAttendance> findAttendanceByDateRangeNative(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query(value = "SELECT a.* FROM tbAttendance a WHERE a.user_id = :userId AND a.date BETWEEN :startDate AND :endDate ORDER BY a.date DESC", nativeQuery = true)
    java.util.List<TbAttendance> findByUserAndDateRangeNative(
            @Param("userId") Integer userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query(value = "SELECT "
            + "a.attendance_id as id, "
            + "a.user_id as userId, "
            + "u.full_name as userName, "
            + "u.department_id as departmentId, "
            + "d.name as departmentName, "
            + "CAST(a.date AS DATE) as date, "
            + "a.time_in as timeIn, "
            + "a.time_out as timeOut, "
            + "UPPER(a.status) as status, "
            + "a.reason "
            + "FROM tbAttendance a "
            + "JOIN tbUser u ON a.user_id = u.user_id "
            + "LEFT JOIN tbDepartment d ON u.department_id = d.department_id "
            + "WHERE CAST(a.date AS DATE) BETWEEN :startDate AND :endDate "
            + "ORDER BY a.date DESC",
            nativeQuery = true)
    List<Object[]> findAttendanceDataByDateRange(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query(value = "SELECT "
            + "a.attendance_id as id, "
            + "a.user_id as userId, "
            + "u.full_name as userName, "
            + "u.department_id as departmentId, "
            + "d.name as departmentName, "
            + "CAST(a.date AS DATE) as date, "
            + "a.time_in as timeIn, "
            + "a.time_out as timeOut, "
            + "UPPER(a.status) as status, "
            + "a.reason "
            + "FROM tbAttendance a "
            + "JOIN tbUser u ON a.user_id = u.user_id "
            + "LEFT JOIN tbDepartment d ON u.department_id = d.department_id "
            + "WHERE a.user_id = :userId AND CAST(a.date AS DATE) BETWEEN :startDate AND :endDate "
            + "ORDER BY a.date DESC",
            nativeQuery = true)
    List<Object[]> findAttendanceDataByUserAndDateRange(
            @Param("userId") Integer userId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
           SELECT DISTINCT a.user
           FROM TbAttendance a
           WHERE a.date BETWEEN :startDate AND :endDate
           """)
    List<TbUser> findDistinctUsersByDateBetween(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query("""
           SELECT DISTINCT a.user
           FROM TbAttendance a
           WHERE a.date BETWEEN :startDate AND :endDate
             AND a.user.department.id = :departmentId
           """)
    List<TbUser> findDistinctUsersByDepartmentAndDateBetween(
            @Param("departmentId") Integer departmentId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
    );

    @Query(value = "SELECT "
            + "a.attendance_id as id, "
            + "a.user_id as userId, "
            + "u.full_name as userName, "
            + "u.department_id as departmentId, "
            + "d.name as departmentName, "
            + "CAST(a.date AS DATE) as date, "
            + "a.time_in as timeIn, "
            + "a.time_out as timeOut, "
            + "UPPER(a.status) as status, "
            + "a.reason "
            + "FROM tbAttendance a "
            + "JOIN tbUser u ON a.user_id = u.user_id "
            + "LEFT JOIN tbDepartment d ON u.department_id = d.department_id "
            + "WHERE CAST(a.date AS DATE) BETWEEN :startDate AND :endDate "
            + "  AND (:userId IS NULL OR a.user_id = :userId) "
            + "  AND (:departmentId IS NULL OR u.department_id = :departmentId) "
            + "  AND u.line_id IN (:lineIds) "
            + "ORDER BY a.date DESC",
            nativeQuery = true)
    List<Object[]> findAttendanceDataByFiltersWithLineIds(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("userId") Integer userId,
            @Param("departmentId") Integer departmentId,
            @Param("lineIds") List<Integer> lineIds
    );

    @Query(value = "SELECT "
            + "a.attendance_id as id, "
            + "a.user_id as userId, "
            + "u.full_name as userName, "
            + "u.department_id as departmentId, "
            + "d.name as departmentName, "
            + "CAST(a.date AS DATE) as date, "
            + "a.time_in as timeIn, "
            + "a.time_out as timeOut, "
            + "UPPER(a.status) as status, "
            + "a.reason "
            + "FROM tbAttendance a "
            + "JOIN tbUser u ON a.user_id = u.user_id "
            + "LEFT JOIN tbDepartment d ON u.department_id = d.department_id "
            + "WHERE CAST(a.date AS DATE) BETWEEN :startDate AND :endDate "
            + "AND (:userId IS NULL OR a.user_id = :userId) "
            + "AND (:departmentId IS NULL OR u.department_id = :departmentId) "
            + "AND (:lineId IS NULL OR u.line_id = :lineId) "
            + "ORDER BY a.date DESC",
            nativeQuery = true)
    List<Object[]> findAttendanceDataByFilters(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("userId") Integer userId,
            @Param("departmentId") Integer departmentId,
            @Param("lineId") Integer lineId
    );

    @Query("""
           SELECT COUNT(DISTINCT a.date)
           FROM TbAttendance a
           WHERE a.user = :user
             AND a.date BETWEEN :startDate AND :endDate
             AND a.status IN :statuses
           """)
    long countDistinctAttendanceDaysByUserAndDateBetweenAndStatusIn(
            @Param("user") TbUser user,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<AttendanceStatus> statuses
    );

    @Query("""
           SELECT DISTINCT a.date
           FROM TbAttendance a
           WHERE a.user = :user
             AND a.date BETWEEN :startDate AND :endDate
             AND a.status IN :statuses
           """)
    List<LocalDate> findDistinctAttendanceDatesByUserAndDateBetweenAndStatusIn(
            @Param("user") TbUser user,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") List<AttendanceStatus> statuses
    );


}
