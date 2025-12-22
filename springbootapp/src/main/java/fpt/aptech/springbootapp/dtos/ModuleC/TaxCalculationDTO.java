
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
    private BigDecimal insuranceRate;
    private BigDecimal insuranceDeduction;
    private BigDecimal totalDeduction;
    private BigDecimal grossIncome;

    // Chi tiết tính thuế theo bậc (cho display/logging)
    private BigDecimal bracket1Amount;
    private BigDecimal bracket1Tax;
    private BigDecimal bracket2Amount;
    private BigDecimal bracket2Tax;
    private BigDecimal bracket3Amount;
    private BigDecimal bracket3Tax;
    private BigDecimal bracket4Amount;
    private BigDecimal bracket4Tax;
    private BigDecimal bracket5Amount;
    private BigDecimal bracket5Tax;

    // Tổng thuế
    private BigDecimal totalTax;

    // Ghi chú chi tiết
    private String note;
}