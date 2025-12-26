package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.math.BigDecimal;
import java.math.RoundingMode;

public class PayrollCalHelper {

    //Tính lương TimeBased : baseSalary / standardWorkingDays * actualWorkingDays
    public static BigDecimal calculateTimeSalary(
            BigDecimal baseSalary,
            BigDecimal actualWorkingDays,
            BigDecimal standardWorkingDays) {

        if (baseSalary == null || actualWorkingDays == null || standardWorkingDays == null) {
            return BigDecimal.ZERO;
        }
        if (standardWorkingDays.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        return baseSalary
                .divide(standardWorkingDays, PayrollCalConstants.SCALE, RoundingMode.HALF_UP)
                .multiply(actualWorkingDays)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

    // Backward compatible (cũ): giữ tạm, mặc định 26
    public static BigDecimal calculateTimeSalary(
            BigDecimal baseSalary,
            BigDecimal actualWorkingDays) {

        return calculateTimeSalary(baseSalary, actualWorkingDays, PayrollCalConstants.STANDARD_WORKING_DAYS);
    }

    //Tính lương OT: (OT1Hours * hourlyRate * 1.5) + (OT2Hours * hourlyRate * 2.0)
    // hourlyRate = baseSalary / (standardWorkingDays * 8)
    public static BigDecimal calculateOvertimePay(
            BigDecimal baseSalary,
            BigDecimal ot1Hours,
            BigDecimal ot2Hours,
            BigDecimal standardWorkingDays) {

        if (baseSalary == null || standardWorkingDays == null) {
            return BigDecimal.ZERO;
        }
        if (standardWorkingDays.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal hoursPerMonthDynamic = standardWorkingDays.multiply(PayrollCalConstants.HOURS_PER_DAY);
        if (hoursPerMonthDynamic.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal hourlyRate = baseSalary
                .divide(hoursPerMonthDynamic, PayrollCalConstants.SCALE, RoundingMode.HALF_UP);

        BigDecimal ot1Pay = (ot1Hours != null ? ot1Hours : BigDecimal.ZERO)
                .multiply(hourlyRate)
                .multiply(PayrollCalConstants.OT1_MULTIPLIER);

        BigDecimal ot2Pay = (ot2Hours != null ? ot2Hours : BigDecimal.ZERO)
                .multiply(hourlyRate)
                .multiply(PayrollCalConstants.OT2_MULTIPLIER);

        return ot1Pay.add(ot2Pay)
                .setScale(PayrollCalConstants.SCALE, RoundingMode.HALF_UP);
    }

    // Backward compatible (cũ): giữ tạm, mặc định 26
    public static BigDecimal calculateOvertimePay(
            BigDecimal baseSalary,
            BigDecimal ot1Hours,
            BigDecimal ot2Hours) {

        return calculateOvertimePay(baseSalary, ot1Hours, ot2Hours, PayrollCalConstants.STANDARD_WORKING_DAYS);
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