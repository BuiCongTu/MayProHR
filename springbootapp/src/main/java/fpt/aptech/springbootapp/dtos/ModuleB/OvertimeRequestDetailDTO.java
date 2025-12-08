package fpt.aptech.springbootapp.dtos.ModuleB;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OvertimeRequestDetailDTO {
    private Integer id;
    private Integer lineId;
    private String lineName;
    private Integer numEmployees;
    private Integer lineLevel;
}