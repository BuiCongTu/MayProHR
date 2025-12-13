package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

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

    // --- KHOẢN KHẤU TRỪ & TRỢ CẤP ---
    private BigDecimal allowance;
    private BigDecimal totalDeduction;

    //thue thu nhap ca nhan
    private TaxCalculationDTO taxCalculation;


    // --- TỔNG LƯƠNG ---
    private BigDecimal totalPay;
    private String calculationNote;
}