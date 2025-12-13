package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeTaxProfileDTO {
    private Integer userId;
    private String userName;
    private LocalDate hireDate;
    private Integer numberOfDependents;
    private BigDecimal insuranceRate;
    private Boolean isEligibleForPersonalDeduction;
    private Boolean isEligibleForDependentDeduction;
    private String note;
}
