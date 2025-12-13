package fpt.aptech.springbootapp.dtos.ModuleC;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollAllowance.AllowanceType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
@Getter
@Setter
public class AllowanceRequestDTO {
    private BigDecimal amount;
    private AllowanceType type;
    private String reason;

}
