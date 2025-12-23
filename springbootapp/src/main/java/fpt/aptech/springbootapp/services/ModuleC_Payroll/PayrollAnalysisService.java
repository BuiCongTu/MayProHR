package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import fpt.aptech.springbootapp.dtos.ModuleC.PayrollAnalysisRequest;
import fpt.aptech.springbootapp.dtos.ModuleC.PayrollAnalysisResponse;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeePayrollRepo;
import fpt.aptech.springbootapp.repositories.UserRepository;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class PayrollAnalysisService {

    @Value("${google.gemini.api-key}")
    private String geminiApiKey;

    private static final String GEMINI_URL
            = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

    private final EmployeePayrollRepo employeePayrollRepo;
    private final UserRepository userRepository;
    private final PayrollCalculationService payrollCalculationService;

    /**
     * Phân tích payroll với AI
     */
    public PayrollAnalysisResponse analyzePayroll(PayrollAnalysisRequest request) throws Exception {

        // Validate input
        if (request.getYear() == null || request.getMonth() == null) {
            throw new IllegalArgumentException("Year and month are required");
        }

        if (request.getMonth() < 1 || request.getMonth() > 12) {
            throw new IllegalArgumentException("Invalid month");
        }

        // Lấy dữ liệu payroll
        List<TbEmployeePayroll> payrolls = fetchPayrollData(request);

        if (payrolls.isEmpty()) {
            throw new IllegalArgumentException("No payroll data found for " + request.getMonth() + "/" + request.getYear());
        }

        // Tính toán insights cơ bản
        PayrollAnalysisResponse.OverviewInsights overview = calculateOverview(payrolls, request);

        // Phát hiện bất thường
        List<PayrollAnalysisResponse.AnomalyDetection> anomalies = detectAnomalies(payrolls, request);

        // Gợi ý
        List<PayrollAnalysisResponse.Recommendation> recommendations = generateRecommendations(payrolls, anomalies);

        // So sánh với tháng trước
        PayrollAnalysisResponse.ComparisonInsights comparison = null;
        if (Boolean.TRUE.equals(request.getCompareWithPrevious())) {
            comparison = compareWithPreviousMonth(payrolls, request);
        }

        // Gọi Gemini AI để tạo summary
        String aiSummary = generateAISummary(request, overview, anomalies, recommendations, comparison);

        // Build response
        return PayrollAnalysisResponse.builder()
                .analysisType(request.getAnalysisType() != null ? request.getAnalysisType() : "all")
                .year(request.getYear())
                .month(request.getMonth())
                .analyzedAt(LocalDateTime.now())
                .overview(overview)
                .anomalies(anomalies)
                .recommendations(recommendations)
                .comparison(comparison)
                .aiSummary(aiSummary)
                .build();
    }

    /**
     * Lấy dữ liệu payroll theo request
     */
    private List<TbEmployeePayroll> fetchPayrollData(PayrollAnalysisRequest request) {
        List<TbEmployeePayroll> payrolls;

        if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
            // Lấy theo user IDs
            payrolls = request.getUserIds().stream()
                    .map(userId -> employeePayrollRepo.findByUserIdAndYearAndMonth(userId, request.getYear(), request.getMonth()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
        } else if (request.getDepartmentId() != null) {
            // Lấy theo department
            List<TbUser> users = userRepository.findByDepartmentId(request.getDepartmentId());
            payrolls = users.stream()
                    .map(user -> employeePayrollRepo.findByUserIdAndYearAndMonth(user.getId(), request.getYear(), request.getMonth()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
        } else {
            // Lấy tất cả
            payrolls = employeePayrollRepo.findByYearAndMonth(request.getYear(), request.getMonth());
        }

        return payrolls;
    }

    /**
     * Tính toán overview insights
     */
    private PayrollAnalysisResponse.OverviewInsights calculateOverview(
            List<TbEmployeePayroll> payrolls, PayrollAnalysisRequest request) {

        int totalEmployees = payrolls.size();

        BigDecimal totalPayrollCost = payrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal averageSalary = totalEmployees > 0
                ? totalPayrollCost.divide(BigDecimal.valueOf(totalEmployees), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        BigDecimal totalOvertimePay = payrolls.stream()
                .map(TbEmployeePayroll::getOvertimePay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalTax = payrolls.stream()
                .map(TbEmployeePayroll::getPersonalIncomeTax)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalInsurance = payrolls.stream()
                .map(TbEmployeePayroll::getDeduction)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalLatePenalty = payrolls.stream()
                .map(TbEmployeePayroll::getLatePenalty)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Salary type distribution
        Map<String, Integer> salaryTypeDistribution = new HashMap<>();
        for (TbEmployeePayroll payroll : payrolls) {
            TbUser user = payroll.getUser();
            if (user != null) {
                String salaryType = user.getSalaryType() != null ? user.getSalaryType().toString() : "Unknown";
                salaryTypeDistribution.put(salaryType, salaryTypeDistribution.getOrDefault(salaryType, 0) + 1);
            }
        }

        // Top earners (top 5)
        List<String> topEarners = payrolls.stream()
                .sorted((p1, p2) -> {
                    BigDecimal pay1 = p1.getTotalPay() != null ? p1.getTotalPay() : BigDecimal.ZERO;
                    BigDecimal pay2 = p2.getTotalPay() != null ? p2.getTotalPay() : BigDecimal.ZERO;
                    return pay2.compareTo(pay1);
                })
                .limit(5)
                .map(p -> {
                    String userName = p.getUser() != null ? p.getUser().getFullName() : "Unknown";
                    BigDecimal pay = p.getTotalPay() != null ? p.getTotalPay() : BigDecimal.ZERO;
                    return userName + " (" + formatCurrency(pay) + ")";
                })
                .collect(Collectors.toList());

        // Top overtime employees
        List<String> topOvertimeEmployees = payrolls.stream()
                .filter(p -> p.getOvertimePay() != null && p.getOvertimePay().compareTo(BigDecimal.ZERO) > 0)
                .sorted((p1, p2) -> {
                    BigDecimal ot1 = p1.getOvertimePay() != null ? p1.getOvertimePay() : BigDecimal.ZERO;
                    BigDecimal ot2 = p2.getOvertimePay() != null ? p2.getOvertimePay() : BigDecimal.ZERO;
                    return ot2.compareTo(ot1);
                })
                .limit(5)
                .map(p -> {
                    String userName = p.getUser() != null ? p.getUser().getFullName() : "Unknown";
                    BigDecimal ot = p.getOvertimePay() != null ? p.getOvertimePay() : BigDecimal.ZERO;
                    return userName + " (" + formatCurrency(ot) + ")";
                })
                .collect(Collectors.toList());

        return PayrollAnalysisResponse.OverviewInsights.builder()
                .totalEmployees(totalEmployees)
                .totalPayrollCost(totalPayrollCost)
                .averageSalary(averageSalary)
                .totalOvertimePay(totalOvertimePay)
                .totalTax(totalTax)
                .totalInsurance(totalInsurance)
                .totalLatePenalty(totalLatePenalty)
                .salaryTypeDistribution(salaryTypeDistribution)
                .topEarners(topEarners)
                .topOvertimeEmployees(topOvertimeEmployees)
                .build();
    }

    /**
     * Phát hiện bất thường
     */
    private List<PayrollAnalysisResponse.AnomalyDetection> detectAnomalies(
            List<TbEmployeePayroll> payrolls, PayrollAnalysisRequest request) {

        List<PayrollAnalysisResponse.AnomalyDetection> anomalies = new ArrayList<>();

        // Tính average salary để làm baseline
        BigDecimal avgSalary = payrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(payrolls.size()), 2, RoundingMode.HALF_UP);

        for (TbEmployeePayroll payroll : payrolls) {
            TbUser user = payroll.getUser();
            String userName = user != null ? user.getFullName() : "Unknown";
            Integer userId = user != null ? user.getId() : null;

            // 1. Overtime quá cao (>40h/tháng)
            BigDecimal ot1 = payroll.getOt1Hours() != null ? payroll.getOt1Hours() : BigDecimal.ZERO;
            BigDecimal ot2 = payroll.getOt2Hours() != null ? payroll.getOt2Hours() : BigDecimal.ZERO;
            BigDecimal overtimeHours = ot1.add(ot2);
            if (overtimeHours.compareTo(BigDecimal.valueOf(40)) > 0) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_overtime")
                        .severity("warning")
                        .userId(userId)
                        .userName(userName)
                        .description("Số giờ OT vượt ngưỡng 40h/tháng")
                        .actualValue(overtimeHours)
                        .expectedValue(BigDecimal.valueOf(40))
                        .recommendation("Cân nhắc tuyển thêm nhân sự hoặc tối ưu lại lịch làm việc")
                        .build());
            }

            // 2. Lương thấp bất thường (< 50% avg)
            BigDecimal totalPay = payroll.getTotalPay();
            if (totalPay != null && avgSalary.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal threshold = avgSalary.multiply(BigDecimal.valueOf(0.5));
                if (totalPay.compareTo(threshold) < 0) {
                    anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                            .type("low_salary")
                            .severity("warning")
                            .userId(userId)
                            .userName(userName)
                            .description("Lương thấp hơn 50% mức trung bình")
                            .actualValue(totalPay)
                            .expectedValue(avgSalary)
                            .recommendation("Xem xét điều chỉnh lương hoặc kiểm tra ngày công")
                            .build());
                }
            }

            // 3. Phạt đi trễ cao (>5 lần/tháng)
            Integer lateCount = payroll.getLateCount();
            if (lateCount != null && lateCount > 5) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_late_count")
                        .severity("warning")
                        .userId(userId)
                        .userName(userName)
                        .description("Số lần đi trễ vượt ngưỡng cho phép (>5 lần)")
                        .actualValue(BigDecimal.valueOf(lateCount))
                        .expectedValue(BigDecimal.valueOf(5))
                        .recommendation("Nhắc nhở nhân viên về kỷ luật hoặc kiểm tra vấn đề cá nhân")
                        .build());
            }

            // 4. Ngày nghỉ không phép cao
            BigDecimal unpaidLeaveDays = payroll.getUnpaidLeaveDays();
            if (unpaidLeaveDays != null && unpaidLeaveDays.compareTo(BigDecimal.valueOf(3)) > 0) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_unpaid_leave")
                        .severity("critical")
                        .userId(userId)
                        .userName(userName)
                        .description("Số ngày nghỉ không phép vượt ngưỡng (>3 ngày)")
                        .actualValue(unpaidLeaveDays)
                        .expectedValue(BigDecimal.valueOf(3))
                        .recommendation("Kiểm tra tình trạng sức khỏe hoặc mức độ cam kết của nhân viên")
                        .build());
            }
        }

        return anomalies;
    }

    /**
     * Tạo recommendations
     */
    private List<PayrollAnalysisResponse.Recommendation> generateRecommendations(
            List<TbEmployeePayroll> payrolls,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies) {

        List<PayrollAnalysisResponse.Recommendation> recommendations = new ArrayList<>();

        // 1. Tối ưu chi phí OT
        long highOvertimeCount = anomalies.stream()
                .filter(a -> "high_overtime".equals(a.getType()))
                .count();

        if (highOvertimeCount > 0) {
            BigDecimal totalOvertimePay = payrolls.stream()
                    .map(TbEmployeePayroll::getOvertimePay)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            recommendations.add(PayrollAnalysisResponse.Recommendation.builder()
                    .category("cost_optimization")
                    .priority("high")
                    .title("Tối ưu chi phí tăng ca")
                    .description("Có " + highOvertimeCount + " nhân viên làm OT vượt ngưỡng. "
                            + "Chi phí OT hiện tại: " + formatCurrency(totalOvertimePay))
                    .estimatedImpact(totalOvertimePay.multiply(BigDecimal.valueOf(0.3))) // Giảm 30%
                    .actionItems(Arrays.asList(
                            "Phân bổ lại công việc giữa các nhân viên",
                            "Tuyển thêm nhân sự part-time",
                            "Áp dụng quy trình làm việc hiệu quả hơn"
                    ))
                    .build());
        }

        // 2. Cải thiện kỷ luật
        long highLateCount = anomalies.stream()
                .filter(a -> "high_late_count".equals(a.getType()))
                .count();

        if (highLateCount > 0) {
            recommendations.add(PayrollAnalysisResponse.Recommendation.builder()
                    .category("employee_retention")
                    .priority("medium")
                    .title("Cải thiện kỷ luật nhân viên")
                    .description("Có " + highLateCount + " nhân viên đi trễ thường xuyên")
                    .estimatedImpact(BigDecimal.ZERO)
                    .actionItems(Arrays.asList(
                            "Tổ chức buổi nói chuyện cá nhân với nhân viên",
                            "Xem xét chính sách giờ giấc linh hoạt",
                            "Tăng cường theo dõi chấm công"
                    ))
                    .build());
        }

        // 3. Review lương thấp
        long lowSalaryCount = anomalies.stream()
                .filter(a -> "low_salary".equals(a.getType()))
                .count();

        if (lowSalaryCount > 0) {
            recommendations.add(PayrollAnalysisResponse.Recommendation.builder()
                    .category("employee_retention")
                    .priority("high")
                    .title("Xem xét tăng lương cho nhân viên có mức lương thấp")
                    .description("Có " + lowSalaryCount + " nhân viên có lương thấp hơn 50% mức trung bình. "
                            + "Rủi ro mất nhân viên cao.")
                    .estimatedImpact(BigDecimal.ZERO)
                    .actionItems(Arrays.asList(
                            "Review lại mức lương theo thị trường",
                            "Cân nhắc tăng lương hoặc phụ cấp",
                            "Đánh giá lại performance để điều chỉnh"
                    ))
                    .build());
        }

        return recommendations;
    }

    /**
     * So sánh với tháng trước
     */
    private PayrollAnalysisResponse.ComparisonInsights compareWithPreviousMonth(
            List<TbEmployeePayroll> currentPayrolls, PayrollAnalysisRequest request) {

        int previousMonth = request.getMonth() - 1;
        int previousYear = request.getYear();

        if (previousMonth == 0) {
            previousMonth = 12;
            previousYear--;
        }

        // Lấy dữ liệu tháng trước
        List<TbEmployeePayroll> previousPayrolls = employeePayrollRepo.findByYearAndMonth(previousYear, previousMonth);

        if (previousPayrolls.isEmpty()) {
            return PayrollAnalysisResponse.ComparisonInsights.builder()
                    .previousMonth(previousMonth)
                    .previousYear(previousYear)
                    .summary("Không có dữ liệu tháng trước để so sánh")
                    .build();
        }

        // Tính tổng chi phí hiện tại
        BigDecimal currentCost = currentPayrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Tính tổng chi phí tháng trước
        BigDecimal previousCost = previousPayrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal costChange = currentCost.subtract(previousCost);

        BigDecimal costChangePercent = previousCost.compareTo(BigDecimal.ZERO) > 0
                ? costChange.divide(previousCost, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        int employeeCountChange = currentPayrolls.size() - previousPayrolls.size();

        String trend = costChange.compareTo(BigDecimal.ZERO) > 0 ? "increasing"
                : costChange.compareTo(BigDecimal.ZERO) < 0 ? "decreasing"
                : "stable";

        String summary = String.format(
                "Tháng %d/%d so với %d/%d: Chi phí %s %s (%s%%), số nhân viên %s %d người",
                request.getMonth(), request.getYear(),
                previousMonth, previousYear,
                trend.equals("increasing") ? "tăng" : trend.equals("decreasing") ? "giảm" : "ổn định",
                formatCurrency(costChange.abs()),
                costChangePercent.abs().setScale(2, RoundingMode.HALF_UP),
                employeeCountChange > 0 ? "tăng" : employeeCountChange < 0 ? "giảm" : "không đổi",
                Math.abs(employeeCountChange)
        );

        return PayrollAnalysisResponse.ComparisonInsights.builder()
                .previousMonth(previousMonth)
                .previousYear(previousYear)
                .costChange(costChange)
                .costChangePercent(costChangePercent)
                .employeeCountChange(employeeCountChange)
                .trend(trend)
                .summary(summary)
                .build();
    }

    /**
     * Gọi Gemini AI để tạo summary bằng tiếng Việt tự nhiên
     */
    private String generateAISummary(
            PayrollAnalysisRequest request,
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) throws Exception {

        try {
            // Tạo prompt cho Gemini
            String prompt = buildPromptForGemini(request, overview, anomalies, recommendations, comparison);

            // Gọi Gemini API
            RestTemplate restTemplate = new RestTemplate();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-goog-api-key", geminiApiKey);

            Map<String, Object> body = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "parts", List.of(
                                            Map.of("text", prompt)
                                    )
                            )
                    )
            );

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            System.out.println("[PAYROLL_ANALYSIS] Calling Gemini AI for summary...");

            ResponseEntity<Map> response = restTemplate.postForEntity(GEMINI_URL, entity, Map.class);

            Map<String, Object> responseBody = response.getBody();

            if (responseBody == null) {
                throw new RuntimeException("Gemini API returned null response");
            }

            // Parse response
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseBody.get("candidates");

            if (candidates == null || candidates.isEmpty()) {
                throw new RuntimeException("Gemini API returned no candidates");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

            String aiText = (String) parts.get(0).get("text");

            System.out.println("[PAYROLL_ANALYSIS] Gemini AI summary generated successfully");

            return aiText;

        } catch (Exception e) {
            System.err.println("[PAYROLL_ANALYSIS] Gemini AI error: " + e.getMessage());
            e.printStackTrace();

            // Fallback: Tạo summary đơn giản không dùng AI
            return generateFallbackSummary(overview, anomalies, recommendations, comparison);
        }
    }

    /**
     * Tạo prompt cho Gemini
     */
    private String buildPromptForGemini(
            PayrollAnalysisRequest request,
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) {

        StringBuilder prompt = new StringBuilder();

        prompt.append("Bạn là chuyên gia phân tích bảng lương (Payroll Analytics Expert). ");
        prompt.append("Hãy tạo một bản tóm tắt phân tích bảng lương tháng ").append(request.getMonth())
                .append("/").append(request.getYear()).append(" bằng tiếng Việt chuyên nghiệp và dễ hiểu.\n\n");

        prompt.append("## DỮ LIỆU PHÂN TÍCH:\n\n");

        // Overview
        prompt.append("### TỔNG QUAN:\n");
        prompt.append("- Tổng số nhân viên: ").append(overview.getTotalEmployees()).append("\n");
        prompt.append("- Tổng chi phí lương: ").append(formatCurrency(overview.getTotalPayrollCost())).append("\n");
        prompt.append("- Lương trung bình: ").append(formatCurrency(overview.getAverageSalary())).append("\n");
        prompt.append("- Tổng tiền OT: ").append(formatCurrency(overview.getTotalOvertimePay())).append("\n");
        prompt.append("- Tổng thuế TNCN: ").append(formatCurrency(overview.getTotalTax())).append("\n");
        prompt.append("- Tổng bảo hiểm: ").append(formatCurrency(overview.getTotalInsurance())).append("\n");
        prompt.append("- Tổng phạt đi trễ: ").append(formatCurrency(overview.getTotalLatePenalty())).append("\n");

        if (overview.getSalaryTypeDistribution() != null && !overview.getSalaryTypeDistribution().isEmpty()) {
            prompt.append("- Phân bổ loại lương: ");
            overview.getSalaryTypeDistribution().forEach((type, count)
                    -> prompt.append(type).append(" (").append(count).append(" người), ")
            );
            prompt.append("\n");
        }

        if (overview.getTopEarners() != null && !overview.getTopEarners().isEmpty()) {
            prompt.append("- Top 5 thu nhập cao: ").append(String.join(", ", overview.getTopEarners())).append("\n");
        }

        prompt.append("\n");

        // Anomalies
        if (anomalies != null && !anomalies.isEmpty()) {
            prompt.append("### BẤT THƯỜNG PHÁT HIỆN:\n");
            for (int i = 0; i < Math.min(anomalies.size(), 10); i++) {
                PayrollAnalysisResponse.AnomalyDetection anomaly = anomalies.get(i);
                prompt.append((i + 1)).append(". [").append(anomaly.getSeverity().toUpperCase()).append("] ");
                prompt.append(anomaly.getUserName()).append(": ").append(anomaly.getDescription()).append("\n");
            }
            prompt.append("\n");
        }

        // Recommendations
        if (recommendations != null && !recommendations.isEmpty()) {
            prompt.append("### GỢI Ý TỐI ƯU:\n");
            for (int i = 0; i < recommendations.size(); i++) {
                PayrollAnalysisResponse.Recommendation rec = recommendations.get(i);
                prompt.append((i + 1)).append(". [").append(rec.getPriority().toUpperCase()).append("] ");
                prompt.append(rec.getTitle()).append("\n");
            }
            prompt.append("\n");
        }

        // Comparison
        if (comparison != null && comparison.getSummary() != null) {
            prompt.append("### SO SÁNH VỚI THÁNG TRƯỚC:\n");
            prompt.append(comparison.getSummary()).append("\n\n");
        }

        prompt.append("\n## YÊU CẦU:\n");
        prompt.append("Hãy viết một bản tóm tắt phân tích 200-300 từ bằng tiếng Việt, bao gồm:\n");
        prompt.append("1. Đánh giá tổng quan tình hình lương tháng này\n");
        prompt.append("2. Nhận xét về các điểm đáng chú ý (tích cực và tiêu cực)\n");
        prompt.append("3. Đề xuất hành động ưu tiên cần thực hiện\n");
        prompt.append("4. Xu hướng và dự báo (nếu có so sánh)\n\n");
        prompt.append("Viết theo phong cách chuyên nghiệp, ngắn gọn, dễ hiểu, sử dụng bullet points khi cần.");

        return prompt.toString();
    }

    /**
     * Fallback summary khi Gemini lỗi
     */
    private String generateFallbackSummary(
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) {

        StringBuilder summary = new StringBuilder();

        summary.append("📊 TÓM TẮT PHÂN TÍCH BẢNG LƯƠNG\n\n");

        summary.append("TỔNG QUAN:\n");
        summary.append("- Tổng ").append(overview.getTotalEmployees()).append(" nhân viên\n");
        summary.append("- Chi phí: ").append(formatCurrency(overview.getTotalPayrollCost())).append("\n");
        summary.append("- Trung bình: ").append(formatCurrency(overview.getAverageSalary())).append("/người\n");
        summary.append("- Tổng OT: ").append(formatCurrency(overview.getTotalOvertimePay())).append("\n\n");

        if (anomalies != null && !anomalies.isEmpty()) {
            summary.append("⚠️ CẢNH BÁO: Phát hiện ").append(anomalies.size()).append(" bất thường cần xử lý\n\n");
        }

        if (recommendations != null && !recommendations.isEmpty()) {
            summary.append("💡 GỢI Ý: Có ").append(recommendations.size()).append(" đề xuất tối ưu\n\n");
        }

        if (comparison != null && comparison.getSummary() != null) {
            summary.append("📈 XU HƯỚNG:\n").append(comparison.getSummary()).append("\n");
        }

        return summary.toString();
    }

    /**
     * Format currency
     */
    private String formatCurrency(BigDecimal amount) {
        if (amount == null) {
            return "0 VND";
        }
        return String.format("%,.0f VND", amount);
    }
}
