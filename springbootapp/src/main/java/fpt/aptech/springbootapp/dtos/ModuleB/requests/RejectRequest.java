package fpt.aptech.springbootapp.dtos.ModuleB.requests;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RejectRequest {
    private Integer approverId;
    private String reason;
}
