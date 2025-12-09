package fpt.aptech.springbootapp.dtos.ModuleC;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TaxCalculationDTO {
    private Integer userId;
    private String userName;
    private LocalDate hireDate;
    
    //buoc 1: thu thap luong
    private BigDecimal grossIncome;
    
    //b2 giam tru
    private Integer numberOfDependents;  // Số người phụ thuộc
    private BigDecimal insuranceRate;    // Tỷ lệ bảo hiểm (10.5%)
    
    // Các khoản giảm trừ
    private BigDecimal personalDeductionAmount;   // 15.5M
    private BigDecimal dependentDeductionAmount;  // 6.2M (1 người × 6.2M)
    private BigDecimal insuranceDeductionAmount;  // 4.2M (40M × 10.5%)
    private BigDecimal totalDeductionAmount;      // 25.9M
    
    //b3 thu nhap tinh thue
    private BigDecimal taxableIncome;  // 14.1M
    
    // === STEP 4: TÍNH THUẾ THEO BẬC ===
    private TaxBracketDetail bracket1;  // 0-10M @ 5%
    private TaxBracketDetail bracket2;  // 10-30M @ 10%
    private TaxBracketDetail bracket3;  // 30-60M @ 20%
    private TaxBracketDetail bracket4;  // 60-100M @ 30%
    private TaxBracketDetail bracket5;  // 7>100M @ 35%

    private BigDecimal totalTax;
    private String calculationNote;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TaxBracketDetail {
        private Integer bracketNumber;
        private BigDecimal fromIncome;
        private BigDecimal toIncome;
        private BigDecimal taxRate;
        private BigDecimal incomeInBracket;
        private BigDecimal taxAmount;
    }
}