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

import java.math.*;
import java.time.*;
import java.util.List;

@Service
public class PersonalIncomeTaxCalService {
    private final EmployeeTaxProfileService taxProfileService;
    private final TaxBracketRepository taxBracketRepository;
    private final TaxDeductionService taxDeductionService;
    private final PayrollTaxCalculationRepo taxCalculationRepository;
    private final ObjectMapper objectMapper;

    private static final int SCALE = 2;

    @Autowired
    public PersonalIncomeTaxCalService(EmployeeTaxProfileService taxProfileService, TaxBracketRepository taxBracketRepository, TaxDeductionService taxDeductionService, PayrollTaxCalculationRepo taxCalculationRepository, ObjectMapper objectMapper) {
        this.taxProfileService = taxProfileService;
        this.taxBracketRepository = taxBracketRepository;
        this.taxDeductionService = taxDeductionService;
        this.taxCalculationRepository = taxCalculationRepository;
        this.objectMapper = objectMapper;
    }

    public TaxCalculationDTO calculatePersonalIncomeTax(
            TbUser user,
            BigDecimal grossIncome,
            LocalDate payrollMonth) {

        TaxCalculationDTO dto = new TaxCalculationDTO();
        dto.setUserId(user.getId());
        dto.setUserName(user.getFullName());
        dto.setHireDate(user.getHireDate());
        dto.setGrossIncome(grossIncome);

        //step1: lay thong tin hso thue
        TbEmployeeTaxProfile taxProfile = taxProfileService.getOrCreateTaxProfile(user);
        dto.setNumberOfDependents(taxProfile.getNumberOfDependents());
        dto.setInsuranceRate(taxProfile.getInsuranceRate());

        //step 2 tinh cacs gia tru gia canh
        // 2.1 giảm trừ gia cảnh cá nhân
        BigDecimal personalDeduction = BigDecimal.ZERO;
        if (taxProfile.getIsEligibleForPersonalDeduction()) {
            personalDeduction = taxDeductionService.getPersonalDeduction(payrollMonth);
            dto.setPersonalDeductionAmount(personalDeduction);
        } else {
            dto.setPersonalDeductionAmount(BigDecimal.ZERO);
        }

        // 2.2 Giảm trừ gia cảnh phụ thuộc
        BigDecimal dependentDeduction = BigDecimal.ZERO;
        if (taxProfile.getIsEligibleForDependentDeduction() && taxProfile.getNumberOfDependents() > 0) {
            BigDecimal deductionPerPerson = taxDeductionService.getDependentDeduction(payrollMonth);
            dependentDeduction = deductionPerPerson.multiply(new BigDecimal(taxProfile.getNumberOfDependents()));
            dto.setDependentDeductionAmount(dependentDeduction);
        } else {
            dto.setDependentDeductionAmount(BigDecimal.ZERO);
        }

        // 2.3 Bảo hiểm
        BigDecimal insuranceDeduction = grossIncome
                .multiply(taxProfile.getInsuranceRate())
                .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);
        dto.setInsuranceDeductionAmount(insuranceDeduction);

        // tinh total giam tru
        BigDecimal totalDeduction = personalDeduction
                .add(dependentDeduction)
                .add(insuranceDeduction);
        dto.setTotalDeductionAmount(totalDeduction);

        // step4 tinh thu nhap tinh thue
        BigDecimal taxableIncome = grossIncome.subtract(totalDeduction);
        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) {
            taxableIncome = BigDecimal.ZERO;
        }
        dto.setTaxableIncome(taxableIncome);

        // step 5tinhs thue theo bac
        List<TbTaxBracket> brackets = taxBracketRepository.findByIsActiveTrueOrderByBracketNumber();
        BigDecimal totalTax = BigDecimal.ZERO;

        for (TbTaxBracket bracket : brackets) {
            TaxCalculationDTO.TaxBracketDetail bracketDetail = new TaxCalculationDTO.TaxBracketDetail();
            bracketDetail.setBracketNumber(bracket.getBracketNumber());
            bracketDetail.setFromIncome(bracket.getFromIncome());
            bracketDetail.setToIncome(bracket.getToIncome());
            bracketDetail.setTaxRate(bracket.getTaxRate());

            // Tính thu nhập trong bậc này
            BigDecimal incomeInBracket = calculateIncomeInBracket(
                    taxableIncome,
                    bracket.getFromIncome(),
                    bracket.getToIncome()
            );

            bracketDetail.setIncomeInBracket(incomeInBracket);

            // Tính thuế của bậc này
            BigDecimal taxAmount = incomeInBracket
                    .multiply(bracket.getTaxRate())
                    .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);

            bracketDetail.setTaxAmount(taxAmount);
            totalTax = totalTax.add(taxAmount);

            // Gán vào DTO tương ứng
            switch (bracket.getBracketNumber()) {
                case 1 -> dto.setBracket1(bracketDetail);
                case 2 -> dto.setBracket2(bracketDetail);
                case 3 -> dto.setBracket3(bracketDetail);
                case 4 -> dto.setBracket4(bracketDetail);
                case 5 -> dto.setBracket5(bracketDetail);
            }
        }

        dto.setTotalTax(totalTax.setScale(SCALE, RoundingMode.HALF_UP));
        dto.setCalculationNote(generateCalculationNote(dto));

        return dto;
    }

//     Tính thu nhập trong một bậc thuế
    private BigDecimal calculateIncomeInBracket(
            BigDecimal taxableIncome,
            BigDecimal fromIncome,
            BigDecimal toIncome) {

        if (taxableIncome.compareTo(fromIncome) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal actualTo = toIncome;
        if (taxableIncome.compareTo(toIncome) < 0) {
            actualTo = taxableIncome;
        }

        return actualTo.subtract(fromIncome);
    }

//    note chi tiết tính toán
    private String generateCalculationNote(TaxCalculationDTO dto) {
        StringBuilder note = new StringBuilder();
        note.append("PERSONAL INCOME TAX CALCULATION 2026:\n");
        note.append(String.format("1. Gross income: %.0f VND\n", dto.getGrossIncome()));
        note.append(String.format("2. Personal deduction: %.0f VND\n", dto.getPersonalDeductionAmount()));
        note.append(String.format("3. Dependent deduction (%d dependents): %.0f VND\n",
                dto.getNumberOfDependents(), dto.getDependentDeductionAmount()));
        note.append(String.format("4. Insurance (%.1f%%): %.0f VND\n",
                dto.getInsuranceRate(), dto.getInsuranceDeductionAmount()));
        note.append(String.format("5. Total deductions: %.0f VND\n", dto.getTotalDeductionAmount()));
        note.append(String.format("6. Taxable income: %.0f VND\n", dto.getTaxableIncome()));

        if (dto.getBracket1() != null && dto.getBracket1().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bracket 1: %.0f × 5%% = %.0f VND\n",
                    dto.getBracket1().getIncomeInBracket(), dto.getBracket1().getTaxAmount()));
        }
        if (dto.getBracket2() != null && dto.getBracket2().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bracket 2: %.0f × 10%% = %.0f VND\n",
                    dto.getBracket2().getIncomeInBracket(), dto.getBracket2().getTaxAmount()));
        }
        if (dto.getBracket3() != null && dto.getBracket3().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bracket 3: %.0f × 20%% = %.0f VND\n",
                    dto.getBracket3().getIncomeInBracket(), dto.getBracket3().getTaxAmount()));
        }
        if (dto.getBracket4() != null && dto.getBracket4().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bracket 4: %.0f × 30%% = %.0f VND\n",
                    dto.getBracket4().getIncomeInBracket(), dto.getBracket4().getTaxAmount()));
        }
        if (dto.getBracket5() != null && dto.getBracket5().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bracket 5: %.0f × 35%% = %.0f VND\n",
                    dto.getBracket5().getIncomeInBracket(), dto.getBracket5().getTaxAmount()));
        }

        note.append(String.format("6. TOTAL TAX: %.0f VND", dto.getTotalTax()));

        return note.toString();
    }

//     Lưu chi tiết tính thuế vào database
    public void saveTaxCalculation(
            TbEmployeePayroll employeePayroll,
            TaxCalculationDTO taxDTO) {

        TbPayrollTaxCalculation taxCalc = new TbPayrollTaxCalculation();
        taxCalc.setEmployeePayroll(employeePayroll);

        taxCalc.setGrossIncome(taxDTO.getGrossIncome());
        taxCalc.setInsuranceDeduction(taxDTO.getInsuranceDeductionAmount());
        taxCalc.setPersonalDeduction(taxDTO.getPersonalDeductionAmount());
        taxCalc.setDependentDeduction(taxDTO.getDependentDeductionAmount());
        taxCalc.setTotalDeduction(taxDTO.getTotalDeductionAmount());
        taxCalc.setTaxableIncome(taxDTO.getTaxableIncome());

        if (taxDTO.getBracket1() != null) taxCalc.setBracket1Tax(taxDTO.getBracket1().getTaxAmount());
        if (taxDTO.getBracket2() != null) taxCalc.setBracket2Tax(taxDTO.getBracket2().getTaxAmount());
        if (taxDTO.getBracket3() != null) taxCalc.setBracket3Tax(taxDTO.getBracket3().getTaxAmount());
        if (taxDTO.getBracket4() != null) taxCalc.setBracket4Tax(taxDTO.getBracket4().getTaxAmount());
        if (taxDTO.getBracket5() != null) taxCalc.setBracket5Tax(taxDTO.getBracket5().getTaxAmount());

        taxCalc.setTotalTax(taxDTO.getTotalTax());
        taxCalc.setCalculationDetail(taxDTO.getCalculationNote());

        taxCalculationRepository.save(taxCalc);

        // Cập nhật lại TbEmployeePayroll
        employeePayroll.setPersonalIncomeTax(taxDTO.getTotalTax());
        employeePayroll.setTaxDeductionTotal(taxDTO.getTotalDeductionAmount());
    }

}
