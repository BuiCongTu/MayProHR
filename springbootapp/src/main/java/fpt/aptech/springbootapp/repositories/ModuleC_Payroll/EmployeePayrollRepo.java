package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;

@Repository
public interface EmployeePayrollRepo extends JpaRepository<TbEmployeePayroll, Integer> {

    List<TbEmployeePayroll> findByUserId(Integer userId);

    Optional<TbEmployeePayroll> findByUserIdAndPayrollMonth(Integer userId, LocalDate month);

    List<TbEmployeePayroll> findByUserIdAndPayrollYearMonth(Integer userId, String yearMonth);

    //xem bang luong ca nhan theo thang trong nam
    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE ep.user.id = :userId AND YEAR(ep.payroll.month) = :year AND MONTH(ep.payroll.month) = :month")
    Optional<TbEmployeePayroll> findByUserIdAndYearAndMonth(
            @Param("userId") Integer userId,
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    // Lấy tất cả payroll theo năm và tháng (cho AI analysis)
    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE YEAR(ep.payroll.month) = :year AND MONTH(ep.payroll.month) = :month")
    List<TbEmployeePayroll> findByYearAndMonth(
            @Param("year") Integer year,
            @Param("month") Integer month
    );

    //lay lich su toan bo luong cua ca nhan
//    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE ep.user.id = :userId ORDER BY ep.payroll.month DESC")
//    List<TbEmployeePayroll> findByUserId(@Param("userId") Integer userId);
    // lay ds luong theo nam
    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE ep.user.id = :userId AND YEAR(ep.payroll.month) = :year ORDER BY ep.payroll.month DESC")
    List<TbEmployeePayroll> findByUserIdAndYear(
            @Param("userId") Integer userId,
            @Param("year") Integer year);

    //lay ds luong theo payroll id
    List<TbEmployeePayroll> findByPayrollId(Integer payrollId);

    //Lấy danh sách theo salaryType trong 1 tháng
    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE ep.payroll.month = :month AND ep.user.salaryType = :salaryType ORDER BY ep.user.id")
    List<TbEmployeePayroll> findByPayrollMonthAndSalaryType(
            @Param("month") LocalDate month,
            @Param("salaryType") fpt.aptech.springbootapp.entities.Core.TbUser.SalaryType salaryType
    );

    //Lấy danh sách theo department và tháng
    @Query("SELECT ep FROM TbEmployeePayroll ep WHERE ep.payroll.department.id = :departmentId AND ep.payroll.month = :month")
    List<TbEmployeePayroll> findByDepartmentAndMonth(
            @Param("departmentId") Integer departmentId,
            @Param("month") LocalDate month
    );

    Optional<TbEmployeePayroll> findByPayrollIdAndUserId(Integer payrollId, Integer userId);

}
