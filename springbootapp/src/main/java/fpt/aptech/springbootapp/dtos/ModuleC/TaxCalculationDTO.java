
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
public class TaxCalculationDTO {
    // Thu nhập đầu vào (đã trừ BH + phạt)
    private BigDecimal taxableIncomeBeforeFamily;

    // Giảm trừ gia cảnh
    private BigDecimal personalDeduction;          // giảm trừ bản thân
    private BigDecimal dependentDeduction;         // giảm trừ người phụ thuộc

    // Thu nhập tính thuế (sau giảm trừ gia cảnh)
    private BigDecimal taxableIncome;

    // Chi tiết tính thuế theo bậc (cho display/logging)
    private BigDecimal bracket1Amount;
    private BigDecimal bracket1Tax;
    private BigDecimal bracket2Amount;
    private BigDecimal bracket2Tax;
    private BigDecimal bracket3Amount;
    private BigDecimal bracket3Tax;

    // Tổng thuế
    private BigDecimal totalTax;

    // Ghi chú chi tiết
    private String note;
}
//package fpt.aptech.springbootapp.dtos.ModuleC;
//
//import com.fasterxml.jackson.annotation.JsonInclude;
//import lombok.*;
//
//import java.math.BigDecimal;
//import java.time.LocalDate;
//
//@Getter
//@Setter
//@NoArgsConstructor
//@AllArgsConstructor
//@JsonInclude(JsonInclude.Include.NON_NULL)
//public class TaxCalculationDTO {
//    private Integer userId;
//    private String userName;
//    private LocalDate hireDate;
//
//    //buoc 1: thu thap luong
//    private BigDecimal grossIncome;
//
//    //b2 giam tru
//    private Integer numberOfDependents;  // Số người phụ thuộc
//    private BigDecimal insuranceRate;    // Tỷ lệ bảo hiểm (10.5%)
//
//    // Các khoản giảm trừ
//    private BigDecimal personalDeductionAmount;   // 15.5M
//    private BigDecimal dependentDeductionAmount;  // 6.2M (1 người × 6.2M)
//    private BigDecimal insuranceDeductionAmount;  // 4.2M (40M × 10.5%)
//    private BigDecimal totalDeductionAmount;      // 25.9M
//
//    //b3 thu nhap tinh thue
//    private BigDecimal taxableIncome;  // 14.1M
//
//    // === STEP 4: TÍNH THUẾ THEO BẬC ===
//    private TaxBracketDetail bracket1;  // 0-10M @ 5%
//    private TaxBracketDetail bracket2;  // 10-30M @ 10%
//    private TaxBracketDetail bracket3;  // 30-60M @ 20%
//    private TaxBracketDetail bracket4;  // 60-100M @ 30%
//    private TaxBracketDetail bracket5;  // 7>100M @ 35%
//
//    private BigDecimal totalTax;
//    private String calculationNote;
//
//    @Getter
//    @Setter
//    @NoArgsConstructor
//    @AllArgsConstructor
//    public static class TaxBracketDetail {
//        private Integer bracketNumber;
//        private BigDecimal fromIncome;
//        private BigDecimal toIncome;
//        private BigDecimal taxRate;
//        private BigDecimal incomeInBracket;
//        private BigDecimal taxAmount;
//    }
//}