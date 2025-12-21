package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class PayrollCalHelper {

    //Tính lương TimeBased : baseSalary / 26 * actualWorkingDays
    public static BigDecimal calculateTimeSalary(
            BigDecimal baseSalary,
            BigDecimal actualWorkingDays) {
        
        if (baseSalary == null || actualWorkingDays == null) {
            return BigDecimal.ZERO;
        }

        return baseSalary
                .divide(PayrollCalConstants.STANDARD_WORKING_DAYS, PayrollCalConstants.SCALE, RoundingMode.HALF_UP)
                .multiply(actualWorkingDays)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

    //Tính lương OT: (OT1Hours * hourlyRate * 1.5) + (OT2Hours * hourlyRate * 2.0)
    public static BigDecimal calculateOvertimePay(
            BigDecimal baseSalary,
            BigDecimal ot1Hours,
            BigDecimal ot2Hours) {
        
        if (baseSalary == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal hourlyRate = baseSalary
                .divide(PayrollCalConstants.HOURS_PER_MONTH, PayrollCalConstants.SCALE, RoundingMode.HALF_UP);

        BigDecimal ot1Pay = (ot1Hours != null ? ot1Hours : BigDecimal.ZERO)
                .multiply(hourlyRate)
                .multiply(PayrollCalConstants.OT1_MULTIPLIER);

        BigDecimal ot2Pay = (ot2Hours != null ? ot2Hours : BigDecimal.ZERO)
                .multiply(hourlyRate)
                .multiply(PayrollCalConstants.OT2_MULTIPLIER);

        return ot1Pay.add(ot2Pay)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

    // Tính phạt đi trễ: lateCount * latePenaltyPerOccurrence
    public static BigDecimal calculateLatePenalty(Integer lateCount) {
        if (lateCount == null || lateCount <= 0) {
            return BigDecimal.ZERO;
        }

        return PayrollCalConstants.LATE_PENALTY
                .multiply(new BigDecimal(lateCount));
    }

    //Tính bảo hiểm : incomeBeforeBenefit * insuranceRate
    public static BigDecimal calculateInsurance(BigDecimal incomeBeforeBenefit) {
        if (incomeBeforeBenefit == null) {
            return BigDecimal.ZERO;
        }

        return incomeBeforeBenefit
                .multiply(PayrollCalConstants.INSURANCE_RATE)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

    //Tính weight : (regularHours + otWeekdayHours*1.5 + otHolidayHours*2.0) * wageCoefficient
    public static BigDecimal calculateWeight(
            BigDecimal regularHours,
            BigDecimal ot1Hours,
            BigDecimal ot2Hours,
            BigDecimal wageCoefficient) {
        
        if (regularHours == null) {
            regularHours = BigDecimal.ZERO;
        }
        if (wageCoefficient == null) {
            wageCoefficient = BigDecimal.ONE;
        }

        BigDecimal totalHours = regularHours
                .add((ot1Hours != null ? ot1Hours : BigDecimal.ZERO)
                        .multiply(PayrollCalConstants.OT1_MULTIPLIER))
                .add((ot2Hours != null ? ot2Hours : BigDecimal.ZERO)
                        .multiply(PayrollCalConstants.OT2_MULTIPLIER));

        return totalHours
                .multiply(wageCoefficient)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

}
