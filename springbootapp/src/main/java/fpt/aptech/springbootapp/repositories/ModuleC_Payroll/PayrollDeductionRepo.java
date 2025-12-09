package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PayrollDeductionRepo extends JpaRepository<TbPayrollDeduction, Integer> {

    /**
     * Lấy tất cả khấu trừ của 1 nhân viên
     */
    List<TbPayrollDeduction> findByEmployeePayrollId(Integer employeePayrollId);
}