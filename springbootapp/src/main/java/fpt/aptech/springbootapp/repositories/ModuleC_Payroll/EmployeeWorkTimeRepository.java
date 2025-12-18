package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeWorkTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EmployeeWorkTimeRepository extends JpaRepository<TbEmployeeWorkTime, Integer> {
    TbEmployeeWorkTime findByEmployeePayroll_Id(Integer employeePayrollId);

    // Lấy toàn bộ WorkTime của một payroll để build HashMap
    @Query("""
        SELECT wt FROM TbEmployeeWorkTime wt
        WHERE wt.employeePayroll.payroll.id = :payrollId
    """)
    List<TbEmployeeWorkTime> findByPayrollId(Integer payrollId);
}

