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
    private BigDecimal overtimeMultiplier;       // hệ số OT trung bình

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
    private Long totalWorkingHours;
    private BigDecimal productSalaryPerHour;

    // Ghi chú
    private String calculationNote;              // công thức tính toán chi tiết
}
//package fpt.aptech.springbootapp.dtos.ModuleC;
//
//import java.math.BigDecimal;
//
//import lombok.AllArgsConstructor;
//import lombok.Getter;
//import lombok.NoArgsConstructor;
//import lombok.Setter;
//
//@Getter
//@Setter
//@NoArgsConstructor
//@AllArgsConstructor
//public class PayrollCalculationDTO {
//
//    private Integer userId;
//    private String userName;
//    private String salaryType;  // ProductBased, TimeBased
//
//    // --- LƯƠNG CƠ BẢN ---
//    private BigDecimal baseSalary;
//
//    // --- LƯƠNG THỜI GIAN (TimeBased) ---
//    private Integer lateCount;
//    private BigDecimal approvedLeaveDays;
//    private BigDecimal latePenalty;  // 50000 per late
//    private BigDecimal actualWorkingDays;
//    private BigDecimal timeSalary;
//
//    // --- LƯƠNG SẢN PHẨM (ProductBased) ---
//    private Integer productCount;
//    private BigDecimal unitPrice;
//    private Integer countContribution;
//    private Long totalWorkingHours;  // 26*8 + overtime hours
//    private BigDecimal productSalaryPerHour;
//    private BigDecimal productBonus;
//
//    // --- LƯƠNG TĂNG CA ---
//    private BigDecimal overtimeHours;
//    private BigDecimal overtimeMultiplier;  // 1.5 or 2.0
//    private BigDecimal overtimePay;
//
//    // trọng số tính luong
//    private BigDecimal wageCoefficient; // hệ số lương
//    private BigDecimal workingDays; // số ngày công thực tế
//    private BigDecimal regularHours; // giờ làm thường
//    private BigDecimal otWeekdayHours; // giờ OT ngày thường
//    private BigDecimal otHolidayHours; // giờ OT lễ/chủ nhật
//    private BigDecimal weight; // trọng số: (regularHours + otWeekdayHours*1.5 + otHolidayHours*2.0) * wageCoefficient
//
//    // --- KHOẢN KHẤU TRỪ & TRỢ CẤP ---
//    private BigDecimal allowance;
//    private BigDecimal totalDeduction;
//
//    //thue thu nhap ca nhan
//    private TaxCalculationDTO taxCalculation;
//
//    // --- TỔNG LƯƠNG ---
//    private BigDecimal totalPay;
//    private String calculationNote;
//}

// package fpt.aptech.springbootapp.dtos.ModuleC;
// import java.math.BigDecimal;
// import java.time.LocalDate;
// import lombok.AllArgsConstructor;
// import lombok.Builder;
// import lombok.Getter;
// import lombok.NoArgsConstructor;
// import lombok.Setter;
// @Getter
// @Setter
// @NoArgsConstructor
// @AllArgsConstructor
// @Builder
// public class PayrollCalculationDTO {
//     // === THÔNG TIN NHÂN VIÊN (Bước 5) ===
//     private Integer userId;
//     private String userName;
//     private String phone;
//     private String skillLevel;
//     private String salaryType; // "TimeBased" or "ProductBased"
//     private BigDecimal baseSalary; // Lương cơ bản
//     private BigDecimal allowance; // Phụ cấp
//     private BigDecimal wageCoefficient; // Hệ số lương
//     private LocalDate hireDate;
//     // === NGÀY CÔNG (Bước 2-7) ===
//     private BigDecimal standardWorkingDays; // 26 ngày chuẩn (Bước 6)
//     private Integer actualWorkingDays; // Số ngày công thực tế từ chấm công
//     private BigDecimal approvedLeaveDays; // Tổng ngày nghỉ phép được duyệt (Bước 3)
//     private BigDecimal excessLeaveDays; // Ngày nghỉ vượt quota (Bước 7.2)
//     private BigDecimal workingDaysForPayroll; // Số ngày công tính lương (Bước 7 kết quả)
//     // === LƯƠNG THEO THỜI GIAN (Bước 8-9) ===
//     private BigDecimal dailySalary; // Lương ngày = Lương cơ bản / 26 (Bước 8)
//     private BigDecimal timeSalary; // Lương thời gian = Lương ngày × Số ngày công (Bước 9)
//     // === TĂNG CA (Bước 4, 10-15) ===
//     private BigDecimal otWeekdayHours; // Giờ OT ngày thường (Bước 4)
//     private BigDecimal otHolidayHours; // Giờ OT ngày lễ (Bước 4)
//     private BigDecimal overtimeHours; // Tổng giờ OT
//     private BigDecimal hourlyRate; // Lương giờ = Lương cơ bản / 176 (Bước 12)
//     private BigDecimal overtimeWeekday; // Tiền OT ngày thường × 1,5 (Bước 13)
//     private BigDecimal overtimeHoliday; // Tiền OT ngày lễ × 2,0 (Bước 14)
//     private BigDecimal totalOvertimePay; // Tổng tiền tăng ca (Bước 15)
//     // === PHẠT (Bước 10-11) ===
//     private Integer lateCount; // Số lần đi trễ (Bước 10)
//     private BigDecimal latePenalty; // Phạt = Số lần × 50.000 (Bước 11)
//     // === TỔNG THU NHẬP TRƯỚC KHẤU TRỪ (Bước 16) ===
//     private BigDecimal totalIncome; // = timeSalary + totalOvertimePay + allowance - latePenalty
//     // === KHẤU TRỪ TRƯỚC THUẾ (Bước 17-18) ===
//     private BigDecimal insurance; // Bảo hiểm = Lương cơ bản × 10,5% (Bước 17)
//     private BigDecimal personalDeduction; // Giảm trừ bản thân (1.8M)
//     private BigDecimal dependentDeduction; // Giảm trừ phụ thuộc
//     private BigDecimal incomeForTax; // Thu nhập chịu thuế (Bước 18)
//     // === THUẾ (Bước 19) ===
//     private TaxCalculationDTO taxCalculation; // Chi tiết tính thuế TNCN (Bước 19)
//     private BigDecimal incomeTax; // Thuế TNCN cần trích
//     // === LƯƠNG THỰC NHẬN (Bước 20) ===
//     private BigDecimal netSalary; // = totalIncome - insurance - incomeTax (Bước 20)
//     // === GHI CHÚ ===
//     private String calculationNote; // Chi tiết công thức tính toán
//     private LocalDate calculationDate; // Ngày tính lương
//     private String status; // "pending", "completed", "approved"
// }
