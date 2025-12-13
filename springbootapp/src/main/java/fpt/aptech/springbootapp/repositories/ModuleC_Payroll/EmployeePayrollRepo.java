package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.*;

// xu ly luong emp
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
}
