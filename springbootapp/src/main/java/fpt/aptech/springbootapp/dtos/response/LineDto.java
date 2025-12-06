package fpt.aptech.springbootapp.dtos.response;

import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LineDto {
    private Integer id;
    private String name;
    private Integer level;
    private Integer departmentId;
    private String departmentName;

    private Integer parentId;
    private String managerName;
    private Integer managerId;
    private String description;

    @Builder.Default
    private List<LineDto> children = new ArrayList<>();
}