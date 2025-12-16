package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeProduction;

@Repository
public interface EmployeeProductionRepo extends JpaRepository<TbEmployeeProduction, Integer> {

    @Query("""
        SELECT ep FROM TbEmployeeProduction ep
        WHERE ep.production.department.id = :departmentId
          AND YEAR(ep.production.dop) = YEAR(:month)
          AND MONTH(ep.production.dop) = MONTH(:month)
    """)
    List<TbEmployeeProduction> findByDepartmentAndMonth(@Param("departmentId") Integer departmentId,
            @Param("month") LocalDate month);

    @Query("""
        SELECT ep FROM TbEmployeeProduction ep
        WHERE ep.employee.id = :userId
          AND YEAR(ep.production.dop) = YEAR(:month)
          AND MONTH(ep.production.dop) = MONTH(:month)
    """)
    List<TbEmployeeProduction> findByEmployeeAndMonth(@Param("userId") Integer userId,
            @Param("month") LocalDate month);

    @Query("""
        SELECT ep FROM TbEmployeeProduction ep
        WHERE ep.production.id = :productionId
    """)
    List<TbEmployeeProduction> findByProduction(@Param("productionId") Integer productionId);

    @Query("""
        SELECT ep FROM TbEmployeeProduction ep
        WHERE ep.employee.id = :userId
    """)
    List<TbEmployeeProduction> findByEmployee(@Param("userId") Integer userId);
}
