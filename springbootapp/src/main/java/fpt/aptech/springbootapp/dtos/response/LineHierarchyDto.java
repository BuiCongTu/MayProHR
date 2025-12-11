package fpt.aptech.springbootapp.dtos.response;

import lombok.*;
import java.util.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LineHierarchyDto {
    private Integer departmentId;
    private String departmentName;

    // Root lines with full tree structure
    @Builder.Default
    private List<LineNodeDto> rootLines = new ArrayList<>();
}

