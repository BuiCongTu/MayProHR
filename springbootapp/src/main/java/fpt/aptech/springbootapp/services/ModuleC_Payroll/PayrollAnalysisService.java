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

        // Fetch payroll data
        List<TbEmployeePayroll> payrolls = fetchPayrollData(request);

        if (payrolls.isEmpty()) {
            throw new IllegalArgumentException("No payroll data found for " + request.getMonth() + "/" + request.getYear());
        }

        // Calculate basic insights
        PayrollAnalysisResponse.OverviewInsights overview = calculateOverview(payrolls, request);

        // Detect anomalies
        List<PayrollAnalysisResponse.AnomalyDetection> anomalies = detectAnomalies(payrolls, request);

        // Generate recommendations
        List<PayrollAnalysisResponse.Recommendation> recommendations = generateRecommendations(payrolls, anomalies);

        // Compare with previous month
        PayrollAnalysisResponse.ComparisonInsights comparison = null;
        if (Boolean.TRUE.equals(request.getCompareWithPrevious())) {
            comparison = compareWithPreviousMonth(payrolls, request);
        }

        // Call Gemini AI to generate summary
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
     * Fetch payroll data based on request
     */
    private List<TbEmployeePayroll> fetchPayrollData(PayrollAnalysisRequest request) {
        List<TbEmployeePayroll> payrolls;

        if (request.getUserIds() != null && !request.getUserIds().isEmpty()) {
            // Fetch by user IDs
            payrolls = request.getUserIds().stream()
                    .map(userId -> employeePayrollRepo.findByUserIdAndYearAndMonth(userId, request.getYear(), request.getMonth()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
        } else if (request.getDepartmentId() != null) {
            // Fetch by department
            List<TbUser> users = userRepository.findByDepartmentId(request.getDepartmentId());
            payrolls = users.stream()
                    .map(user -> employeePayrollRepo.findByUserIdAndYearAndMonth(user.getId(), request.getYear(), request.getMonth()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
        } else {
            // Fetch all
            payrolls = employeePayrollRepo.findByYearAndMonth(request.getYear(), request.getMonth());
        }

        return payrolls;
    }

    /**
     * Calculate overview insights
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
     * Detect anomalies
     */
    private List<PayrollAnalysisResponse.AnomalyDetection> detectAnomalies(
            List<TbEmployeePayroll> payrolls, PayrollAnalysisRequest request) {

        List<PayrollAnalysisResponse.AnomalyDetection> anomalies = new ArrayList<>();

        // Calculate average salary as baseline
        BigDecimal avgSalary = payrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(payrolls.size()), 2, RoundingMode.HALF_UP);

        for (TbEmployeePayroll payroll : payrolls) {
            TbUser user = payroll.getUser();
            String userName = user != null ? user.getFullName() : "Unknown";
            Integer userId = user != null ? user.getId() : null;

            // 1) Excessive overtime (> 40 hours/month)
            BigDecimal ot1 = payroll.getOt1Hours() != null ? payroll.getOt1Hours() : BigDecimal.ZERO;
            BigDecimal ot2 = payroll.getOt2Hours() != null ? payroll.getOt2Hours() : BigDecimal.ZERO;
            BigDecimal overtimeHours = ot1.add(ot2);
            if (overtimeHours.compareTo(BigDecimal.valueOf(40)) > 0) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_overtime")
                        .severity("warning")
                        .userId(userId)
                        .userName(userName)
                        .description("Overtime hours exceed the 40h/month threshold")
                        .actualValue(overtimeHours)
                        .expectedValue(BigDecimal.valueOf(40))
                        .recommendation("Consider hiring additional staff or optimizing work schedules")
                        .build());
            }

            // 2) Abnormally low salary (< 50% of average)
            BigDecimal totalPay = payroll.getTotalPay();
            if (totalPay != null && avgSalary.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal threshold = avgSalary.multiply(BigDecimal.valueOf(0.5));
                if (totalPay.compareTo(threshold) < 0) {
                    anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                            .type("low_salary")
                            .severity("warning")
                            .userId(userId)
                            .userName(userName)
                            .description("Salary is below 50% of the average")
                            .actualValue(totalPay)
                            .expectedValue(avgSalary)
                            .recommendation("Review salary policy or verify attendance/working days")
                            .build());
                }
            }

            // 3) Excessive late arrivals (> 5 times/month)
            Integer lateCount = payroll.getLateCount();
            if (lateCount != null && lateCount > 5) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_late_count")
                        .severity("warning")
                        .userId(userId)
                        .userName(userName)
                        .description("Late arrivals exceed the allowed threshold (> 5 times)")
                        .actualValue(BigDecimal.valueOf(lateCount))
                        .expectedValue(BigDecimal.valueOf(5))
                        .recommendation("Remind the employee about discipline or check for personal issues")
                        .build());
            }

            // 4) High unpaid leave days (> 3 days)
            BigDecimal unpaidLeaveDays = payroll.getUnpaidLeaveDays();
            if (unpaidLeaveDays != null && unpaidLeaveDays.compareTo(BigDecimal.valueOf(3)) > 0) {
                anomalies.add(PayrollAnalysisResponse.AnomalyDetection.builder()
                        .type("high_unpaid_leave")
                        .severity("critical")
                        .userId(userId)
                        .userName(userName)
                        .description("Unpaid leave days exceed the threshold (> 3 days)")
                        .actualValue(unpaidLeaveDays)
                        .expectedValue(BigDecimal.valueOf(3))
                        .recommendation("Check employee health status or commitment level")
                        .build());
            }
        }

        return anomalies;
    }

    /**
     * Generate recommendations
     */
    private List<PayrollAnalysisResponse.Recommendation> generateRecommendations(
            List<TbEmployeePayroll> payrolls,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies) {

        List<PayrollAnalysisResponse.Recommendation> recommendations = new ArrayList<>();

        // 1) Optimize overtime costs
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
                    .title("Optimize overtime costs")
                    .description("There are " + highOvertimeCount + " employees exceeding the overtime threshold. "
                            + "Current overtime cost: " + formatCurrency(totalOvertimePay))
                    .estimatedImpact(totalOvertimePay.multiply(BigDecimal.valueOf(0.3))) // Reduce by 30%
                    .actionItems(Arrays.asList(
                            "Rebalance workload among employees",
                            "Hire part-time staff",
                            "Improve process efficiency"
                    ))
                    .build());
        }

        // 2) Improve discipline
        long highLateCount = anomalies.stream()
                .filter(a -> "high_late_count".equals(a.getType()))
                .count();

        if (highLateCount > 0) {
            recommendations.add(PayrollAnalysisResponse.Recommendation.builder()
                    .category("employee_retention")
                    .priority("medium")
                    .title("Improve employee discipline")
                    .description("There are " + highLateCount + " employees with frequent late arrivals")
                    .estimatedImpact(BigDecimal.ZERO)
                    .actionItems(Arrays.asList(
                            "Have one-on-one discussions with employees",
                            "Consider flexible working hours policy",
                            "Strengthen attendance monitoring"
                    ))
                    .build());
        }

        // 3) Review low salary cases
        long lowSalaryCount = anomalies.stream()
                .filter(a -> "low_salary".equals(a.getType()))
                .count();

        if (lowSalaryCount > 0) {
            recommendations.add(PayrollAnalysisResponse.Recommendation.builder()
                    .category("employee_retention")
                    .priority("high")
                    .title("Review compensation for low salary employees")
                    .description("There are " + lowSalaryCount + " employees earning less than 50% of the average. "
                            + "Risk of attrition may be high.")
                    .estimatedImpact(BigDecimal.ZERO)
                    .actionItems(Arrays.asList(
                            "Review salary levels against market benchmarks",
                            "Consider salary increases or allowances",
                            "Re-evaluate performance for adjustment"
                    ))
                    .build());
        }

        return recommendations;
    }

    /**
     * Compare with the previous month
     */
    private PayrollAnalysisResponse.ComparisonInsights compareWithPreviousMonth(
            List<TbEmployeePayroll> currentPayrolls, PayrollAnalysisRequest request) {

        int previousMonth = request.getMonth() - 1;
        int previousYear = request.getYear();

        if (previousMonth == 0) {
            previousMonth = 12;
            previousYear--;
        }

        // Fetch previous month data
        List<TbEmployeePayroll> previousPayrolls = employeePayrollRepo.findByYearAndMonth(previousYear, previousMonth);

        if (previousPayrolls.isEmpty()) {
            return PayrollAnalysisResponse.ComparisonInsights.builder()
                    .previousMonth(previousMonth)
                    .previousYear(previousYear)
                    .summary("No previous month data available for comparison.")
                    .build();
        }

        BigDecimal currentCost = currentPayrolls.stream()
                .map(TbEmployeePayroll::getTotalPay)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

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

        String costVerb = trend.equals("increasing") ? "increased"
                : trend.equals("decreasing") ? "decreased"
                : "remained stable";

        String headcountVerb = employeeCountChange > 0 ? "increased"
                : employeeCountChange < 0 ? "decreased"
                : "remained unchanged";

        String summary = String.format(
                "Month %d/%d vs %d/%d: Payroll cost %s by %s (%.2f%%), and employee count %s by %d.",
                request.getMonth(), request.getYear(),
                previousMonth, previousYear,
                costVerb,
                formatCurrency(costChange.abs()),
                costChangePercent.abs().setScale(2, RoundingMode.HALF_UP),
                headcountVerb,
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
     * Call Gemini AI to generate a natural-language summary (English)
     */
    private String generateAISummary(
            PayrollAnalysisRequest request,
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) throws Exception {

        try {
            // Build prompt for Gemini
            String prompt = buildPromptForGemini(request, overview, anomalies, recommendations, comparison);

            // Call Gemini API
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

            // Fallback: simple summary without AI
            return generateFallbackSummary(overview, anomalies, recommendations, comparison);
        }
    }

    /**
     * Build prompt for Gemini (English)
     */
    private String buildPromptForGemini(
            PayrollAnalysisRequest request,
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) {

        StringBuilder prompt = new StringBuilder();

        prompt.append("You are a Payroll Analytics Expert. ");
        prompt.append("Write a professional and clear payroll analysis summary for ")
                .append(request.getMonth()).append("/").append(request.getYear())
                .append(" in English.\n\n");

        prompt.append("## ANALYSIS DATA:\n\n");

        prompt.append("### OVERVIEW:\n");
        prompt.append("- Total employees: ").append(overview.getTotalEmployees()).append("\n");
        prompt.append("- Total payroll cost: ").append(formatCurrency(overview.getTotalPayrollCost())).append("\n");
        prompt.append("- Average salary: ").append(formatCurrency(overview.getAverageSalary())).append("\n");
        prompt.append("- Total overtime pay: ").append(formatCurrency(overview.getTotalOvertimePay())).append("\n");
        prompt.append("- Total personal income tax: ").append(formatCurrency(overview.getTotalTax())).append("\n");
        prompt.append("- Total insurance: ").append(formatCurrency(overview.getTotalInsurance())).append("\n");
        prompt.append("- Total late penalties: ").append(formatCurrency(overview.getTotalLatePenalty())).append("\n");

        if (overview.getSalaryTypeDistribution() != null && !overview.getSalaryTypeDistribution().isEmpty()) {
            prompt.append("- Salary type distribution: ");
            overview.getSalaryTypeDistribution().forEach((type, count)
                    -> prompt.append(type).append(" (").append(count).append(" employees), ")
            );
            prompt.append("\n");
        }

        if (overview.getTopEarners() != null && !overview.getTopEarners().isEmpty()) {
            prompt.append("- Top 5 earners: ").append(String.join(", ", overview.getTopEarners())).append("\n");
        }

        if (overview.getTopOvertimeEmployees() != null && !overview.getTopOvertimeEmployees().isEmpty()) {
            prompt.append("- Top overtime employees: ").append(String.join(", ", overview.getTopOvertimeEmployees())).append("\n");
        }

        prompt.append("\n");

        if (anomalies != null && !anomalies.isEmpty()) {
            prompt.append("### ANOMALIES DETECTED:\n");
            for (int i = 0; i < Math.min(anomalies.size(), 10); i++) {
                PayrollAnalysisResponse.AnomalyDetection anomaly = anomalies.get(i);
                prompt.append((i + 1)).append(". [").append(anomaly.getSeverity().toUpperCase()).append("] ");
                prompt.append(anomaly.getUserName()).append(": ").append(anomaly.getDescription()).append("\n");
            }
            prompt.append("\n");
        }

        if (recommendations != null && !recommendations.isEmpty()) {
            prompt.append("### RECOMMENDATIONS:\n");
            for (int i = 0; i < recommendations.size(); i++) {
                PayrollAnalysisResponse.Recommendation rec = recommendations.get(i);
                prompt.append((i + 1)).append(". [").append(rec.getPriority().toUpperCase()).append("] ");
                prompt.append(rec.getTitle()).append("\n");
            }
            prompt.append("\n");
        }

        if (comparison != null && comparison.getSummary() != null) {
            prompt.append("### COMPARISON WITH PREVIOUS MONTH:\n");
            prompt.append(comparison.getSummary()).append("\n\n");
        }

        prompt.append("## REQUIREMENTS:\n");
        prompt.append("Write a 200–300 word summary in English that includes:\n");
        prompt.append("1. Overall assessment of this month's payroll\n");
        prompt.append("2. Notable points (positive and negative)\n");
        prompt.append("3. Priority actions to take\n");
        prompt.append("4. Trend and outlook (if comparison exists)\n\n");
        prompt.append("Use a professional tone. Be concise and structured. Use bullet points where helpful.");

        return prompt.toString();
    }

    /**
     * Fallback summary when Gemini fails (English)
     */
    private String generateFallbackSummary(
            PayrollAnalysisResponse.OverviewInsights overview,
            List<PayrollAnalysisResponse.AnomalyDetection> anomalies,
            List<PayrollAnalysisResponse.Recommendation> recommendations,
            PayrollAnalysisResponse.ComparisonInsights comparison) {

        StringBuilder summary = new StringBuilder();

        summary.append("📊 PAYROLL ANALYSIS SUMMARY\n\n");

        summary.append("OVERVIEW:\n");
        summary.append("- Total employees: ").append(overview.getTotalEmployees()).append("\n");
        summary.append("- Total cost: ").append(formatCurrency(overview.getTotalPayrollCost())).append("\n");
        summary.append("- Average: ").append(formatCurrency(overview.getAverageSalary())).append(" per employee\n");
        summary.append("- Total overtime pay: ").append(formatCurrency(overview.getTotalOvertimePay())).append("\n\n");

        if (anomalies != null && !anomalies.isEmpty()) {
            summary.append("⚠️ ALERT: Detected ").append(anomalies.size()).append(" anomalies that may require attention.\n\n");
        }

        if (recommendations != null && !recommendations.isEmpty()) {
            summary.append("💡 RECOMMENDATIONS: ").append(recommendations.size()).append(" optimization suggestions available.\n\n");
        }

        if (comparison != null && comparison.getSummary() != null) {
            summary.append("📈 TREND:\n").append(comparison.getSummary()).append("\n");
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
