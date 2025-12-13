package fpt.aptech.springbootapp.dtos.ModuleC;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance.AllowanceType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter

public class EmpRecurAllowReqDTO {
    private Integer userId;
    private BigDecimal amount;
    private AllowanceType type;
    private LocalDate startMonth;  // YYYY-MM-01
    private LocalDate endMonth;
    private String reason;

}
