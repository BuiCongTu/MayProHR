package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

public interface PayrollCalculationService {
    //tinh luong đầy đủ cho nhan vien
    PayrollCalculationDTO calEmpSalary(TbUser user, LocalDate payrollMonth, BigDecimal allowance);

    //tinh luong thoi gian
    BigDecimal calTimeSalary(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto);

    //tinh luongw theo ProductBased
    BigDecimal calProductBonus(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto);


    /// /tinh luong OT
    BigDecimal calOvertimePay(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto);

    //tinh khau tru các khoản không phải thuế
    BigDecimal calDeductions(TbUser user, YearMonth yearMonth, PayrollCalculationDTO dto);

    //tính thuế thu nhập cá nhân: Giảm trừ gia cảnh, Bảo hiểm, thuế luỹ tiến
    TaxCalculationDTO calPersonalIncomeTax(TbUser user, BigDecimal grossIncome, LocalDate payrollMonth);


    //lay tong gio OT trong thang
    BigDecimal getTotalOvertimeHours(TbUser user, YearMonth yearMonth);

    //tinh Multiplier tang ca trung binh trong thang
    BigDecimal getAvgOvertimeMultiplier(TbUser user, YearMonth yearMonth);
}
