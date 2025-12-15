package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import fpt.aptech.springbootapp.dtos.ModuleC.TimeBaseAllocDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TimeBaseAllocationResult;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeWorkTime;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayroll;

// CRUD bang luong
@Service
public interface PayrollService {

    //lay bang luong theo thang cu the trong nam
    TbEmployeePayroll getEmpPayrollByYearMonth(Integer userId, Integer year, Integer month);

    //lay danh sach luong theo nam cua emp
    List<TbEmployeePayroll> getEmpPayrollByYear(Integer userId, Integer year);

    //lay toan bo ds luong cua emp
    List<TbEmployeePayroll> getEmpPayrollHistory(Integer userId);

    // dropdown bang luong namw, ds nam co du lieu luong
    List<Integer> getAvailableYears(Integer userId);

    // dropdown thang co du lieu luong
    List<Integer> getAvailableMonths(Integer userId, Integer year);

    // tạo và lưu chỉ số WorkTime cho từng EmployeePayroll trong một Payroll
    void generateAndSaveWorkTimeForPayroll(TbPayroll payroll, LocalDate payrollMonth);

    //truy xuất chỉ số WorkTime theo employeePayrollId
    TbEmployeeWorkTime getEmployeeWorkTimeByEmployeePayrollId(Integer employeePayrollId);

    TimeBaseAllocationResult allocateTimeBaseFund(Integer year, Integer month, BigDecimal fundAmount, List<Integer> employeeIds);

    TimeBaseAllocDTO getTimeBaseAllocationForEmployee(Integer userId, Integer year, Integer month);

    void clearTimeBaseAllocation(Integer year, Integer month, List<Integer> employeeIds);

}
