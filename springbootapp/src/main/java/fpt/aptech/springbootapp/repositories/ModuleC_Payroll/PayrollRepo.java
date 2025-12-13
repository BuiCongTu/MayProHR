package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayroll;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

//tap trung xử lý CRUD bảng luong
@Repository
public interface PayrollRepo extends JpaRepository<TbPayroll, Integer> {
    Optional<TbPayroll> findByDepartmentIdAndMonth(Integer departmentId, LocalDate month);

}
