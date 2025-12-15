package fpt.aptech.springbootapp.dtos.ModuleC;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeBaseAllocationRequest {
    private Integer year;                // Nam tinh luong
    private Integer month;               // Thang tinh luong (1-12)
    private BigDecimal fundAmount;       // Quy luong can chia
    private List<Integer> employeeIds;   // Danh sach nhan vien trong work unit
    private Integer lineId;              // (Optional) Work Unit/Line Id
}
