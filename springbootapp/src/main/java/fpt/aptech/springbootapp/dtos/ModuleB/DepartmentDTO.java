package fpt.aptech.springbootapp.dtos.ModuleB;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class DepartmentDTO {
    private Integer id;
    private String name;
    private int numberOfEmployees;
}
