package fpt.aptech.springbootapp.dtos.ModuleC;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
public class PayrollAnalysisResponse {

    private String analysisType;
    private Integer year;
    private Integer month;
    private LocalDateTime analyzedAt;

    // Phân tích tổng quan
    private OverviewInsights overview;

    // Phát hiện bất thường
    private List<AnomalyDetection> anomalies;

    // Gợi ý tối ưu
    private List<Recommendation> recommendations;

    // So sánh tháng trước
    private ComparisonInsights comparison;

    // Tóm tắt AI (tiếng Việt tự nhiên)
    private String aiSummary;

    // Raw response từ Gemini (optional)
    private String rawAiResponse;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OverviewInsights {

        private Integer totalEmployees;
        private BigDecimal totalPayrollCost;
        private BigDecimal averageSalary;
        private BigDecimal totalOvertimePay;
        private BigDecimal totalTax;
        private BigDecimal totalInsurance;
        private BigDecimal totalLatePenalty;

        // Phân bổ theo loại lương
        private Map<String, Integer> salaryTypeDistribution; // TimeBased vs ProductBased

        // Top performers
        private List<String> topEarners;
        private List<String> topOvertimeEmployees;

        // Insights text
        private String summary;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnomalyDetection {

        private String type; // "high_overtime", "low_salary", "high_late_penalty", etc.
        private String severity; // "critical", "warning", "info"
        private Integer userId;
        private String userName;
        private String description;
        private BigDecimal actualValue;
        private BigDecimal expectedValue;
        private String recommendation;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Recommendation {

        private String category; // "cost_optimization", "employee_retention", "compliance", etc.
        private String priority; // "high", "medium", "low"
        private String title;
        private String description;
        private BigDecimal estimatedImpact; // VND
        private List<String> actionItems;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ComparisonInsights {

        private Integer previousMonth;
        private Integer previousYear;
        private BigDecimal costChange; // VND
        private BigDecimal costChangePercent; // %
        private Integer employeeCountChange;
        private String trend; // "increasing", "decreasing", "stable"
        private String summary;
    }
}
