package fpt.aptech.springbootapp.dtos.ModuleC;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PayrollCalculationDTO {

    private Integer userId;
    private String userName;
    private String salaryType;  // ProductBased, TimeBased

    // --- LƯƠNG CƠ BẢN ---
    private BigDecimal baseSalary;

    // --- LƯƠNG THỜI GIAN (TimeBased) ---
    private Integer lateCount;
    private BigDecimal approvedLeaveDays;
    private BigDecimal latePenalty;  // 50000 per late
    private BigDecimal actualWorkingDays;
    private BigDecimal timeSalary;

    // --- LƯƠNG SẢN PHẨM (ProductBased) ---
    private Integer productCount;
    private BigDecimal unitPrice;
    private Integer countContribution;
    private Long totalWorkingHours;  // 26*8 + overtime hours
    private BigDecimal productSalaryPerHour;
    private BigDecimal productBonus;

    // --- LƯƠNG TĂNG CA ---
    private BigDecimal overtimeHours;
    private BigDecimal overtimeMultiplier;  // 1.5 or 2.0
    private BigDecimal overtimePay;

    // trọng số tính luong
    private BigDecimal wageCoefficient; // hệ số lương
    private BigDecimal workingDays; // số ngày công thực tế
    private BigDecimal regularHours; // giờ làm thường
    private BigDecimal otWeekdayHours; // giờ OT ngày thường
    private BigDecimal otHolidayHours; // giờ OT lễ/chủ nhật
    private BigDecimal weight; // trọng số: (regularHours + otWeekdayHours*1.5 + otHolidayHours*2.0) * wageCoefficient

    // --- KHOẢN KHẤU TRỪ & TRỢ CẤP ---
    private BigDecimal allowance;
    private BigDecimal totalDeduction;

    //thue thu nhap ca nhan
    private TaxCalculationDTO taxCalculation;

    // --- TỔNG LƯƠNG ---
    private BigDecimal totalPay;
    private String calculationNote;
}
