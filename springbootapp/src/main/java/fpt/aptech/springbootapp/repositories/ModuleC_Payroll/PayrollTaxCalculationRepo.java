package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollTaxCalculation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayrollTaxCalculationRepo extends JpaRepository<TbPayrollTaxCalculation, Integer> {
    Optional<TbPayrollTaxCalculation> findByEmployeePayrollId(Integer employeePayrollId);

}
