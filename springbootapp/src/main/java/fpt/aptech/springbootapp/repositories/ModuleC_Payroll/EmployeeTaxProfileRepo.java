package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeTaxProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeTaxProfileRepo extends JpaRepository<TbEmployeeTaxProfile, Integer> {
    Optional<TbEmployeeTaxProfile> findByUserId(Integer userId);

}
