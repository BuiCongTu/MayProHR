package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeBaseAllocationResult {
    private Integer year;
    private Integer month;
    private BigDecimal fundAmount;
    private BigDecimal totalWeight;
    private List<TimeBaseAllocDTO> items;
}
