package fpt.aptech.springbootapp.dtos.ModuleB.requests;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SalaryIncreaseRequest {
    private Integer proposerId;
    private Integer targetUserId;
    private Integer increaseAmount; // in VND
    private String reason;
}

