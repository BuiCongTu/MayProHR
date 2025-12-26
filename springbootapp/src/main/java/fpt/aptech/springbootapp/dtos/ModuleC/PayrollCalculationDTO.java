package fpt.aptech.springbootapp.dtos.ModuleC;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollCalculationDTO {

    // tù TbUsser
    private Integer userId;
    private String userName;
    private String salaryType;
    private BigDecimal baseSalary;
    private BigDecimal wageCoefficient;

    // Chuẩn công / ngày công
    private BigDecimal standardWorkingDays;      // luôn = 26
    private BigDecimal actualWorkingDays;        // số ngày công thực tế
    private BigDecimal paidLeaveDays;            // ngày phép được hưởng lương
    private BigDecimal unpaidLeaveDays;          // ngày phép không hưởng lương
    private BigDecimal approvedLeaveDays;        // tổng ngày phép xin (cũ, giữ để backward compatible)
    private BigDecimal earnedLeaveDays;          // ngày phép được cấp trong tháng (= tháng)
    private BigDecimal remainingLeaveQuota;      // quota phép còn lại

    // Lương
    private BigDecimal timeSalary;               // lương theo thời gian
    private BigDecimal productBonus;             // lương theo sản phẩm
    private BigDecimal overtimePay;              // tiền OT

    // OT1 / OT2
    private BigDecimal otWeekdayHours;           // OT1: giờ ngày thường
    private BigDecimal otHolidayHours;           // OT2: giờ CN/ngày lễ
    private BigDecimal overtimeHours;            // tổng giờ OT
//    private BigDecimal overtimeMultiplier;       // hệ số OT trung bình

    // Công / giờ
    private BigDecimal workingDays;              // số ngày công
    private BigDecimal regularHours;             // giờ làm việc thường (workingDays * 8)
    private BigDecimal weight;                   // chỉ số weight

    // Các khoản trừ (trước thuế)
    private Integer lateCount;                   // số lần đi trễ
    private BigDecimal latePenalty;              // phạt đi trễ
    private BigDecimal insurance;                // bảo hiểm (10.5%)
    private BigDecimal totalDeduction;           // tổng các khoản trừ

    // Thuế
    private BigDecimal grossIncomeForTax;        // thu nhập tính thuế (trước giảm trừ gia cảnh)
    private BigDecimal incomeAfterDeductions;    // thu nhập sau trừ BH + phạt
    private TaxCalculationDTO taxCalculation;    // chi tiết thuế (có giảm trừ gia cảnh, TNCN,...)

    // Phụ cấp & Lương ròng
    private BigDecimal allowance;                // phụ cấp thường xuyên
    private BigDecimal totalPay;                 // lương ròng cuối cùng

    // Các trường chi tiết sản phẩm (khi ProductBased)
    private Integer productCount;
    private BigDecimal unitPrice;
    private Integer countContribution;
//    private Long totalWorkingHours;
//    private BigDecimal productSalaryPerHour;

    // Ghi chú
    private String calculationNote;              // công thức tính toán chi tiết
}