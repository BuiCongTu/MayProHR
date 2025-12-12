package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface PayrollAllowanceRepo extends JpaRepository<TbPayrollAllowance, Integer> {
    // Lấy các trợ cấp dài hạn
    // đang active, áp dụng cho 1 user trong 1 tháng cụ thể
    @Query("""
           SELECT a FROM TbPayrollAllowance a
           WHERE a.user.id = :userId
             AND a.scope = :scope
             AND a.isActive = true
             AND a.startMonth <= :month
             AND (a.endMonth IS NULL OR a.endMonth >= :month)
           """)
    List<TbPayrollAllowance> findRecurringAllowancesForUserAndMonth(
            @Param("userId") Integer userId,
            @Param("month") LocalDate month,
            @Param("scope") TbPayrollAllowance.AllowanceScope scope
    );

    // Lấy tất cả trợ cấp ONE_TIME cho 1 employeePayroll cụ thể
    @Query("""
           SELECT a FROM TbPayrollAllowance a
           WHERE a.employeePayroll.id = :employeePayrollId
             AND a.scope = :scope
           """)
    List<TbPayrollAllowance> findByEmployeePayrollAndScope(
            @Param("employeePayrollId") Integer employeePayrollId,
            @Param("scope") TbPayrollAllowance.AllowanceScope scope
    );

    //lấy tat cả Recurring của 1 employee
    @Query("""
           SELECT a FROM TbPayrollAllowance a
           WHERE a.user.id = :userId
             AND a.scope = fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance.AllowanceScope.RECURRING
             AND a.type = :type
           """)
    List<TbPayrollAllowance> findRecurringByUserAndType(
            @Param("userId") Integer userId,
            @Param("type") TbPayrollAllowance.AllowanceType type
    );



}
