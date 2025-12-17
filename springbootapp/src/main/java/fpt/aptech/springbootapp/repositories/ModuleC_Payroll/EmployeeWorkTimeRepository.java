package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeWorkTime;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeWorkTimeRepository extends JpaRepository<TbEmployeeWorkTime, Integer> {
    TbEmployeeWorkTime findByEmployeePayroll_Id(Integer employeePayrollId);
}
