
package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import com.fasterxml.jackson.databind.ObjectMapper;
import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeTaxProfile;
import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollTaxCalculation;
import fpt.aptech.springbootapp.entities.System.TbTaxBracket;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.PayrollTaxCalculationRepo;
import fpt.aptech.springbootapp.repositories.System.TaxBracketRepository;
import fpt.aptech.springbootapp.services.System.TaxDeductionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Service
public class PersonalIncomeTaxCalService {
    private final EmployeeTaxProfileService taxProfileService;
    private final TaxBracketRepository taxBracketRepository;
    private final TaxDeductionService taxDeductionService;
    private final PayrollTaxCalculationRepo taxCalculationRepository;
    private final ObjectMapper objectMapper;

    private static final int SCALE = 2;
    private static final int RATE_SCALE = 4;

    @Autowired
    public PersonalIncomeTaxCalService(
            EmployeeTaxProfileService taxProfileService,
            TaxBracketRepository taxBracketRepository,
            TaxDeductionService taxDeductionService,
            PayrollTaxCalculationRepo taxCalculationRepository,
            ObjectMapper objectMapper) {
        this.taxProfileService = taxProfileService;
        this.taxBracketRepository = taxBracketRepository;
        this.taxDeductionService = taxDeductionService;
        this.taxCalculationRepository = taxCalculationRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Tính thuế TNCN luỹ tiến theo ví dụ 2026:
     * - grossIncome: Thu nhập chịu thuế (Gross) trước giảm trừ (VD: 40.000.000)
     * - Tổng giảm trừ = Personal + Dependent + Insurance
     * - Thu nhập tính thuế = grossIncome - tổng giảm trừ
     * - Thuế tính theo biểu luỹ tiến từng phần (tbTaxBracket)
     *
     * Ghi chú dữ liệu DB:
     * - tbTaxBracket.from_income/to_income đang lưu theo kiểu nhân 100 (VD 10M -> 1,000,000,000.0)
     * - tbTaxBracket.tax_rate cũng đang lưu nhân 100 (VD 5% -> 500.0)
     * - tbTaxDeduction.deduction_amount cũng đang lưu nhân 100 (VD 15.5M -> 1,550,000,000.0)
     * => Service này sẽ tự normalize để tính đúng.
     */
    public TaxCalculationDTO calculatePersonalIncomeTax(
            TbUser user,
            BigDecimal grossIncome,
            LocalDate payrollMonth) {

        BigDecimal safeGross = (grossIncome != null ? grossIncome : BigDecimal.ZERO);

        System.out.println("1. luong tinh thue " + safeGross.toPlainString());
        safeGross = safeGross.setScale(0, RoundingMode.DOWN);
        System.out.println("1. luong tinh thue (VND) = " + safeGross.toPlainString());

        TaxCalculationDTO dto = new TaxCalculationDTO();

        TbEmployeeTaxProfile taxProfile = taxProfileService.getOrCreateTaxProfile(user);

        System.out.println("2. ho so thue:" + taxProfile);

        BigDecimal personalDeduction = dbMoneyToVnd(taxDeductionService.getPersonalDeduction(payrollMonth))
                .setScale(SCALE, RoundingMode.HALF_UP);
        dto.setPersonalDeduction(personalDeduction);
        System.out.println("3. giam tru ca nhan: " + personalDeduction);

        BigDecimal dependentDeduction = BigDecimal.ZERO;
        Integer dependents = taxProfile.getNumberOfDependents() != null ? taxProfile.getNumberOfDependents() : 0;
        if (dependents > 0) {
            BigDecimal perPerson = dbMoneyToVnd(taxDeductionService.getDependentDeduction(payrollMonth));
            dependentDeduction = perPerson.multiply(new BigDecimal(dependents));
        }
        System.out.println("4. giam tru phu thuoc: " + dependentDeduction);
        dependentDeduction = dependentDeduction.setScale(SCALE, RoundingMode.HALF_UP);
        dto.setDependentDeduction(dependentDeduction);

        BigDecimal insuranceRateFraction = normalizeRateToFraction(taxProfile.getInsuranceRate());
        dto.setInsuranceRate(insuranceRateFraction);

        BigDecimal insuranceDeduction = safeGross
                .multiply(insuranceRateFraction)
                .setScale(SCALE, RoundingMode.HALF_UP);
        dto.setInsuranceDeduction(insuranceDeduction);
        System.out.println("5. bao hiem: " + insuranceDeduction);

        BigDecimal totalDeduction = personalDeduction
                .add(dependentDeduction)
                .add(insuranceDeduction)
                .setScale(SCALE, RoundingMode.HALF_UP);
        System.out.println("6. tong khau tru (totalDeduction): " + totalDeduction);

        dto.setTotalDeduction(totalDeduction);
        dto.setGrossIncome(safeGross);

        BigDecimal taxableIncome = safeGross.subtract(totalDeduction);
        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) taxableIncome = BigDecimal.ZERO;
        taxableIncome = taxableIncome.setScale(SCALE, RoundingMode.HALF_UP);
        dto.setTaxableIncome(taxableIncome);

        System.out.println("7. luong chiuj tinh thue: " + taxableIncome);

        List<TbTaxBracket> brackets = taxBracketRepository.findByIsActiveTrueOrderByBracketNumber();
        if (brackets == null || brackets.isEmpty()) {
            throw new IllegalStateException("Không tìm thấy tbTaxBracket.isActive = true. Thuế TNCN không thể tính (totalTax sẽ ra 0).");
        }

        BigDecimal totalTax = BigDecimal.ZERO;

        for (TbTaxBracket bracket : brackets) {
            BigDecimal from = dbMoneyToVnd(bracket.getFromIncome());
            BigDecimal to = dbMoneyToVnd(bracket.getToIncome());

            BigDecimal rateFraction = normalizeRateToFraction(bracket.getTaxRate());

            BigDecimal incomeInBracket = calculateIncomeInBracket(taxableIncome, from, to);

            System.out.println(String.format("8. luong chiuj tinh thue (%s): %s", bracket.getBracketNumber(), incomeInBracket));
            BigDecimal taxAmount = incomeInBracket
                    .multiply(rateFraction)
                    .setScale(SCALE, RoundingMode.HALF_UP);

            totalTax = totalTax.add(taxAmount);

            switch (bracket.getBracketNumber()) {
                case 1 -> { dto.setBracket1Amount(incomeInBracket); dto.setBracket1Tax(taxAmount); }
                case 2 -> { dto.setBracket2Amount(incomeInBracket); dto.setBracket2Tax(taxAmount); }
                case 3 -> { dto.setBracket3Amount(incomeInBracket); dto.setBracket3Tax(taxAmount); }
                case 4 -> { dto.setBracket4Amount(incomeInBracket); dto.setBracket4Tax(taxAmount); }
                case 5 -> { dto.setBracket5Amount(incomeInBracket); dto.setBracket5Tax(taxAmount); }
                default -> { }
            }
        }

        dto.setTotalTax(totalTax.setScale(SCALE, RoundingMode.HALF_UP));
        dto.setNote(generateCalculationNote(dto));
        return dto;
    }

    private BigDecimal calculateIncomeInBracket(
            BigDecimal taxableIncome,
            BigDecimal fromIncome,
            BigDecimal toIncome) {

        BigDecimal safeTaxable = taxableIncome != null ? taxableIncome : BigDecimal.ZERO;
        BigDecimal from = fromIncome != null ? fromIncome : BigDecimal.ZERO;
        BigDecimal to = toIncome != null ? toIncome : BigDecimal.ZERO;

        if (safeTaxable.compareTo(from) <= 0) {
            return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);
        }

        BigDecimal upper = (to.compareTo(BigDecimal.ZERO) <= 0) ? safeTaxable : to.min(safeTaxable);

        BigDecimal income = upper.subtract(from);
        if (income.compareTo(BigDecimal.ZERO) < 0) income = BigDecimal.ZERO;

        return income.setScale(SCALE, RoundingMode.HALF_UP);
    }


    private String generateCalculationNote(TaxCalculationDTO dto) {
        StringBuilder note = new StringBuilder();
        note.append("TÍNH THUẾ TNCN (2026):\n");
        note.append(String.format("1) Thu nhập chịu thuế (Gross): %.0f VND\n", dto.getGrossIncome()));
        note.append(String.format("2) Giảm trừ bản thân: %.0f VND\n", dto.getPersonalDeduction()));
        note.append(String.format("3) Giảm trừ phụ thuộc: %.0f VND\n", dto.getDependentDeduction()));

        // insuranceRate hiện là fraction => hiển thị % bằng cách *100
        BigDecimal insurancePercent = (dto.getInsuranceRate() != null ? dto.getInsuranceRate() : BigDecimal.ZERO)
                .multiply(new BigDecimal("100"))
                .setScale(2, RoundingMode.HALF_UP);

        note.append(String.format("4) Bảo hiểm (%.2f%%): %.0f VND\n", insurancePercent, dto.getInsuranceDeduction()));
        note.append(String.format("5) Tổng giảm trừ: %.0f VND\n", dto.getTotalDeduction()));
        note.append(String.format("6) Thu nhập tính thuế: %.0f VND\n", dto.getTaxableIncome()));
        note.append("\n--- THUẾ LUỸ TIẾN ---\n");

        if (dto.getBracket1Amount() != null && dto.getBracket1Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 1: %.0f × 5%% = %.0f VND\n", dto.getBracket1Amount(), dto.getBracket1Tax()));
        }
        if (dto.getBracket2Amount() != null && dto.getBracket2Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 2: %.0f × 10%% = %.0f VND\n", dto.getBracket2Amount(), dto.getBracket2Tax()));
        }
        if (dto.getBracket3Amount() != null && dto.getBracket3Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 3: %.0f × 20%% = %.0f VND\n", dto.getBracket3Amount(), dto.getBracket3Tax()));
        }
        if (dto.getBracket4Amount() != null && dto.getBracket4Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 4: %.0f × 30%% = %.0f VND\n", dto.getBracket4Amount(), dto.getBracket4Tax()));
        }
        if (dto.getBracket5Amount() != null && dto.getBracket5Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 5: %.0f × 35%% = %.0f VND\n", dto.getBracket5Amount(), dto.getBracket5Tax()));
        }

        note.append(String.format("\n>>> TỔNG THUẾ: %.0f VND", dto.getTotalTax()));
        return note.toString();
    }

    private BigDecimal dbMoneyToVnd(BigDecimal dbValue) {
        if (dbValue == null) return BigDecimal.ZERO.setScale(SCALE, RoundingMode.HALF_UP);

        // Heuristic:
        // - Nếu DB thật sự lưu "nhân 100" thì các con số VND sẽ phình lên rất lớn (vd 15.500.000 -> 1.550.000.000).
        // - Nếu giá trị đang ở mức "VND bình thường" thì không chia nữa để tránh chia 2 lần.
        BigDecimal abs = dbValue.abs();
        BigDecimal looksLikeScaledBy100Threshold = new BigDecimal("1000000000"); // 1,000,000,000

        BigDecimal vnd = abs.compareTo(looksLikeScaledBy100Threshold) >= 0
                ? dbValue.divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP)
                : dbValue;

        return vnd.setScale(SCALE, RoundingMode.HALF_UP);
    }

    private BigDecimal normalizeRateToFraction(BigDecimal raw) {
        if (raw == null) return BigDecimal.ZERO.setScale(RATE_SCALE, RoundingMode.HALF_UP);

        BigDecimal r = raw.abs();

        if (r.compareTo(BigDecimal.ONE) <= 0) {
            return raw.setScale(RATE_SCALE, RoundingMode.HALF_UP);
        }

        // percent bình thường (vd 10.5 => 10.5%)
        if (r.compareTo(new BigDecimal("1000")) <= 0) {
            return raw.divide(new BigDecimal("100"), RATE_SCALE, RoundingMode.HALF_UP);
        }

        // percent * 100 (vd 500 = 5%)
        return raw.divide(new BigDecimal("10000"), RATE_SCALE, RoundingMode.HALF_UP);
    }

    public TaxCalculationDTO calculatePersonalIncomeTaxWithOverrides(
            TbUser user,
            BigDecimal grossIncome,
            LocalDate payrollMonth,
            BigDecimal overridePersonalDeduction,
            BigDecimal overrideDependentDeduction
    ) {
        BigDecimal safeGross = (grossIncome != null ? grossIncome : BigDecimal.ZERO);
        safeGross = safeGross.setScale(0, RoundingMode.DOWN);

        TaxCalculationDTO dto = new TaxCalculationDTO();

        TbEmployeeTaxProfile taxProfile = taxProfileService.getOrCreateTaxProfile(user);

        BigDecimal personalDeduction = (overridePersonalDeduction != null)
                ? overridePersonalDeduction
                : dbMoneyToVnd(taxDeductionService.getPersonalDeduction(payrollMonth)).setScale(SCALE, RoundingMode.HALF_UP);
        dto.setPersonalDeduction(personalDeduction.setScale(SCALE, RoundingMode.HALF_UP));

        BigDecimal dependentDeduction = (overrideDependentDeduction != null)
                ? overrideDependentDeduction
                : BigDecimal.ZERO;

        if (overrideDependentDeduction == null) {
            Integer dependents = taxProfile.getNumberOfDependents() != null ? taxProfile.getNumberOfDependents() : 0;
            if (dependents > 0) {
                BigDecimal perPerson = dbMoneyToVnd(taxDeductionService.getDependentDeduction(payrollMonth));
                dependentDeduction = perPerson.multiply(new BigDecimal(dependents));
            }
        }
        dependentDeduction = dependentDeduction.setScale(SCALE, RoundingMode.HALF_UP);
        dto.setDependentDeduction(dependentDeduction);

        BigDecimal insuranceRateFraction = normalizeRateToFraction(taxProfile.getInsuranceRate());
        dto.setInsuranceRate(insuranceRateFraction);

        BigDecimal insuranceDeduction = safeGross
                .multiply(insuranceRateFraction)
                .setScale(SCALE, RoundingMode.HALF_UP);
        dto.setInsuranceDeduction(insuranceDeduction);

        BigDecimal totalDeduction = personalDeduction
                .add(dependentDeduction)
                .add(insuranceDeduction)
                .setScale(SCALE, RoundingMode.HALF_UP);

        dto.setTotalDeduction(totalDeduction);
        dto.setGrossIncome(safeGross);

        BigDecimal taxableIncome = safeGross.subtract(totalDeduction);
        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) taxableIncome = BigDecimal.ZERO;
        taxableIncome = taxableIncome.setScale(SCALE, RoundingMode.HALF_UP);
        dto.setTaxableIncome(taxableIncome);

        List<TbTaxBracket> brackets = taxBracketRepository.findByIsActiveTrueOrderByBracketNumber();
        if (brackets == null || brackets.isEmpty()) {
            throw new IllegalStateException("Không tìm thấy tbTaxBracket.isActive = true. Thuế TNCN không thể tính (totalTax sẽ ra 0).");
        }

        BigDecimal totalTax = BigDecimal.ZERO;

        for (TbTaxBracket bracket : brackets) {
            BigDecimal from = dbMoneyToVnd(bracket.getFromIncome());
            BigDecimal to = dbMoneyToVnd(bracket.getToIncome());

            BigDecimal rateFraction = normalizeRateToFraction(bracket.getTaxRate());

            BigDecimal incomeInBracket = calculateIncomeInBracket(taxableIncome, from, to);

            BigDecimal taxAmount = incomeInBracket
                    .multiply(rateFraction)
                    .setScale(SCALE, RoundingMode.HALF_UP);

            totalTax = totalTax.add(taxAmount);

            switch (bracket.getBracketNumber()) {
                case 1 -> { dto.setBracket1Amount(incomeInBracket); dto.setBracket1Tax(taxAmount); }
                case 2 -> { dto.setBracket2Amount(incomeInBracket); dto.setBracket2Tax(taxAmount); }
                case 3 -> { dto.setBracket3Amount(incomeInBracket); dto.setBracket3Tax(taxAmount); }
                case 4 -> { dto.setBracket4Amount(incomeInBracket); dto.setBracket4Tax(taxAmount); }
                case 5 -> { dto.setBracket5Amount(incomeInBracket); dto.setBracket5Tax(taxAmount); }
                default -> { }
            }
        }

        dto.setTotalTax(totalTax.setScale(SCALE, RoundingMode.HALF_UP));
        dto.setNote(generateCalculationNote(dto));
        return dto;
    }

}
