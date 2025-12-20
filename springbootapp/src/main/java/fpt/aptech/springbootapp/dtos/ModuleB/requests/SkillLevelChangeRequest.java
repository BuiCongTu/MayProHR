package fpt.aptech.springbootapp.dtos.ModuleB.requests;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SkillLevelChangeRequest {

    private Integer proposerId;
    private Integer targetUserId;
    private Integer newSkillLevelId;
    private String reason;
}
