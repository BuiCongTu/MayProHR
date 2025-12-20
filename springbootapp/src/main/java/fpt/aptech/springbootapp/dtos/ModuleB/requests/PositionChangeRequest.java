package fpt.aptech.springbootapp.dtos.ModuleB.requests;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PositionChangeRequest {

    private Integer proposerId;
    private Integer targetUserId;
    private Integer newRoleId;
    private Integer newDepartmentId;
    private Integer newSalary; // nullable
    private String reason;
}
