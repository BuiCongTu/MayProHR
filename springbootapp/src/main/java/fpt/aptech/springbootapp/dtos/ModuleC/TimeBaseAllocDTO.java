package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeBaseAllocDTO {
    private Integer userId;
    private BigDecimal skillCoefficient; // He so tay nghe
    private BigDecimal hours;            // So gio lam viec trong thang/unit
    private BigDecimal weight;           // skillCoefficient * hours
    private BigDecimal allocatedSalary;  // (weight / totalWeight) * fund
}
