package fpt.aptech.springbootapp.dtos.response;

import lombok.*;
import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LineNodeDto {
    private Integer id;
    private String name;
    private Integer level;
    private String description;
    private String managerName;
    private Integer managerId;
    private Integer parentId;
    private int totalEmployees;

    @Builder.Default
    private List<LineNodeDto> children = new ArrayList<>();
}
