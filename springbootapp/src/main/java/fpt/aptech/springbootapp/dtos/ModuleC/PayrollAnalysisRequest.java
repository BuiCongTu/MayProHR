package fpt.aptech.springbootapp.dtos.ModuleC;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollAnalysisRequest {

    private Integer year;
    private Integer month;

    // Chọn loại phân tích
    private String analysisType; // "overview", "anomaly", "recommendations", "comparison", "all"

    // Lọc theo phòng ban (optional)
    private Integer departmentId;

    // Lọc theo nhân viên cụ thể (optional)
    private List<Integer> userIds;

    // So sánh với tháng trước (optional)
    private Boolean compareWithPrevious;

    // Ngôn ngữ phản hồi
    private String language; // "vi" (default), "en"
}
