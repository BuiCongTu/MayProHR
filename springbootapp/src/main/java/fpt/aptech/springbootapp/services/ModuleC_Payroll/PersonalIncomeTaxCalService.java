
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
     * Tính thuế TNCN luỹ tiến.
     *
     * QUAN TRỌNG: Từ tháng 5/2025 trở đi, logic được thay đổi:
     * - grossIncome truyền vào đây đã được TRỪ BẢO HIỂM + PHẠT trước
     *   (tức là: timeSalary + overtimePay - insurance - latePenalty)
     * - Service này chỉ cần tính giảm trừ gia cảnh và thuế TNCN
     *
     * Bậc thuế lũy tiến:
     * - 0-10M: 5%
     * - 10M-30M: 10%
     * - 30M-60M: 20%
     * - 60M-100M: 30%
     * - >100M: 35%
     */
    public TaxCalculationDTO calculatePersonalIncomeTax(
            TbUser user,
            BigDecimal grossIncome,
            LocalDate payrollMonth) {

        TaxCalculationDTO dto = new TaxCalculationDTO();

        // STEP 1: Lấy thông tin hồ sơ thuế
        TbEmployeeTaxProfile taxProfile = taxProfileService.getOrCreateTaxProfile(user);

        // STEP 2: Tính các khoản giảm trừ gia cảnh
        // 2.1 Giảm trừ gia cảnh cá nhân
        BigDecimal personalDeduction = BigDecimal.ZERO;
        if (taxProfile.getIsEligibleForPersonalDeduction()) {
            personalDeduction = taxDeductionService.getPersonalDeduction(payrollMonth);
        }
        dto.setPersonalDeduction(personalDeduction);

        // 2.2 Giảm trừ gia cảnh phụ thuộc
        BigDecimal dependentDeduction = BigDecimal.ZERO;
        if (taxProfile.getIsEligibleForDependentDeduction() && taxProfile.getNumberOfDependents() > 0) {
            BigDecimal deductionPerPerson = taxDeductionService.getDependentDeduction(payrollMonth);
            dependentDeduction = deductionPerPerson.multiply(new BigDecimal(taxProfile.getNumberOfDependents()));
        }
        dto.setDependentDeduction(dependentDeduction);

        // STEP 3: Tính thu nhập tính thuế
        // Lưu ý: grossIncome đã là (timeSalary + overtimePay - insurance - latePenalty)
        // trong context mới, chúng ta chỉ cần trừ giảm trừ gia cảnh
        BigDecimal taxableIncomeBeforeFamily = grossIncome;
        dto.setTaxableIncomeBeforeFamily(taxableIncomeBeforeFamily);

        BigDecimal taxableIncome = taxableIncomeBeforeFamily
                .subtract(personalDeduction)
                .subtract(dependentDeduction);
        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) {
            taxableIncome = BigDecimal.ZERO;
        }
        dto.setTaxableIncome(taxableIncome);

        // STEP 4: Tính thuế theo bậc lũy tiến
        List<TbTaxBracket> brackets = taxBracketRepository.findByIsActiveTrueOrderByBracketNumber();
        BigDecimal totalTax = BigDecimal.ZERO;

        for (TbTaxBracket bracket : brackets) {
            // Tính thu nhập trong bậc này
            BigDecimal incomeInBracket = calculateIncomeInBracket(
                    taxableIncome,
                    bracket.getFromIncome(),
                    bracket.getToIncome()
            );

            // Tính thuế của bậc này
            BigDecimal taxAmount = incomeInBracket
                    .multiply(bracket.getTaxRate())
                    .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);

            totalTax = totalTax.add(taxAmount);

            // Gán vào DTO tương ứng
            switch (bracket.getBracketNumber()) {
                case 1 -> {
                    dto.setBracket1Amount(incomeInBracket);
                    dto.setBracket1Tax(taxAmount);
                }
                case 2 -> {
                    dto.setBracket2Amount(incomeInBracket);
                    dto.setBracket2Tax(taxAmount);
                }
                case 3 -> {
                    dto.setBracket3Amount(incomeInBracket);
                    dto.setBracket3Tax(taxAmount);
                }
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

        if (taxableIncome.compareTo(fromIncome) <= 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal actualTo = toIncome;
        if (taxableIncome.compareTo(toIncome) < 0) {
            actualTo = taxableIncome;
        }

        return actualTo.subtract(fromIncome);
    }

    /**
     * Sinh note chi tiết tính toán thuế
     */
    private String generateCalculationNote(TaxCalculationDTO dto) {
        StringBuilder note = new StringBuilder();
        note.append("TÍNH THUẾ THU NHẬP CÁ NHÂN (2025 onwards):\n");
        note.append(String.format("1. Thu nhập sau BH + Phạt: %.0f VND\n", dto.getTaxableIncomeBeforeFamily()));
        note.append(String.format("2. Giảm trừ bản thân: %.0f VND\n", dto.getPersonalDeduction()));
        note.append(String.format("3. Giảm trừ người phụ thuộc: %.0f VND\n", dto.getDependentDeduction()));
        note.append(String.format("4. Thu nhập tính thuế: %.0f VND\n", dto.getTaxableIncome()));
        note.append("\n--- TÍNH THUẾ LUỸ TIẾN ---\n");

        if (dto.getBracket1Amount() != null && dto.getBracket1Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 1 (0-10M): %.0f × 5%% = %.0f VND\n",
                    dto.getBracket1Amount(), dto.getBracket1Tax()));
        }
        if (dto.getBracket2Amount() != null && dto.getBracket2Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 2 (10-30M): %.0f × 10%% = %.0f VND\n",
                    dto.getBracket2Amount(), dto.getBracket2Tax()));
        }
        if (dto.getBracket3Amount() != null && dto.getBracket3Amount().compareTo(BigDecimal.ZERO) > 0) {
            note.append(String.format("   Bậc 3 (30-60M): %.0f × 20%% = %.0f VND\n",
                    dto.getBracket3Amount(), dto.getBracket3Tax()));
        }

        note.append(String.format("\n>>> TỔNG THUẾ: %.0f VND", dto.getTotalTax()));

        return note.toString();
    }

    /**
     * Lưu chi tiết tính thuế vào database
     */
    public void saveTaxCalculation(
            TbEmployeePayroll employeePayroll,
            TaxCalculationDTO taxDTO) {

        TbPayrollTaxCalculation taxCalc = new TbPayrollTaxCalculation();
        taxCalc.setEmployeePayroll(employeePayroll);

        // Lưu các thông tin thuế
        taxCalc.setGrossIncome(taxDTO.getTaxableIncomeBeforeFamily());
        taxCalc.setPersonalDeduction(taxDTO.getPersonalDeduction());
        taxCalc.setDependentDeduction(taxDTO.getDependentDeduction());
        taxCalc.setTaxableIncome(taxDTO.getTaxableIncome());

        // Lưu thuế của từng bậc (nếu có)
        if (taxDTO.getBracket1Tax() != null) {
            taxCalc.setBracket1Tax(taxDTO.getBracket1Tax());
        }
        if (taxDTO.getBracket2Tax() != null) {
            taxCalc.setBracket2Tax(taxDTO.getBracket2Tax());
        }
        if (taxDTO.getBracket3Tax() != null) {
            taxCalc.setBracket3Tax(taxDTO.getBracket3Tax());
        }

        taxCalc.setTotalTax(taxDTO.getTotalTax());
        taxCalc.setCalculationDetail(taxDTO.getNote());

        taxCalculationRepository.save(taxCalc);

        // Cập nhật lại TbEmployeePayroll
        employeePayroll.setPersonalIncomeTax(taxDTO.getTotalTax());
        // Tax deduction total = giảm trừ gia cảnh (không bao gồm BH, vì BH đã trừ trước)
        employeePayroll.setTaxDeductionTotal(
                taxDTO.getPersonalDeduction().add(taxDTO.getDependentDeduction())
        );
    }
}
//package fpt.aptech.springbootapp.services.ModuleC_Payroll;
//
//import com.fasterxml.jackson.databind.ObjectMapper;
//import fpt.aptech.springbootapp.dtos.ModuleC.TaxCalculationDTO;
//import fpt.aptech.springbootapp.entities.Core.TbUser;
//import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeePayroll;
//import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeTaxProfile;
//import fpt.aptech.springbootapp.entities.ModuleC.TbPayrollTaxCalculation;
//import fpt.aptech.springbootapp.entities.System.TbTaxBracket;
//import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.PayrollTaxCalculationRepo;
//import fpt.aptech.springbootapp.repositories.System.TaxBracketRepository;
//import fpt.aptech.springbootapp.services.System.TaxDeductionService;
//import org.springframework.beans.factory.annotation.Autowired;
//import org.springframework.stereotype.Service;
//
//import java.math.*;
//import java.time.*;
//import java.util.List;
//
//@Service
//public class PersonalIncomeTaxCalService {
//    private final EmployeeTaxProfileService taxProfileService;
//    private final TaxBracketRepository taxBracketRepository;
//    private final TaxDeductionService taxDeductionService;
//    private final PayrollTaxCalculationRepo taxCalculationRepository;
//    private final ObjectMapper objectMapper;
//
//    private static final int SCALE = 2;
//
//    @Autowired
//    public PersonalIncomeTaxCalService(EmployeeTaxProfileService taxProfileService, TaxBracketRepository taxBracketRepository, TaxDeductionService taxDeductionService, PayrollTaxCalculationRepo taxCalculationRepository, ObjectMapper objectMapper) {
//        this.taxProfileService = taxProfileService;
//        this.taxBracketRepository = taxBracketRepository;
//        this.taxDeductionService = taxDeductionService;
//        this.taxCalculationRepository = taxCalculationRepository;
//        this.objectMapper = objectMapper;
//    }
//
//    //tính thuế luỹ tiến sau khi trừ gia cảnh + Bảo Hiểm + Phạt
//    //10M/ tháng -> IRPA : 5%
//    //10M-30M/ tháng -> IRPA : 10%
//    //30M-60M/ tháng -> IRPA : 20%
//    //60M-100M/ tháng -> IRPA : 30%
//    //>100/ tháng -> IRPA : 35%
//    public TaxCalculationDTO calculatePersonalIncomeTax(
//            TbUser user,
//            BigDecimal grossIncome,
//            LocalDate payrollMonth) {
//
//        TaxCalculationDTO dto = new TaxCalculationDTO();
//        dto.setUserId(user.getId());
//        dto.setUserName(user.getFullName());
//        dto.setHireDate(user.getHireDate());
//        dto.setGrossIncome(grossIncome);
//
//        //step1: lay thong tin hso thue
//        TbEmployeeTaxProfile taxProfile = taxProfileService.getOrCreateTaxProfile(user);
//        dto.setNumberOfDependents(taxProfile.getNumberOfDependents());
//        dto.setInsuranceRate(taxProfile.getInsuranceRate());
//
//        //step 2 tinh cacs gia tru gia canh
//        // 2.1 giảm trừ gia cảnh cá nhân
//        BigDecimal personalDeduction = BigDecimal.ZERO;
//        if (taxProfile.getIsEligibleForPersonalDeduction()) {
//            personalDeduction = taxDeductionService.getPersonalDeduction(payrollMonth);
//            dto.setPersonalDeductionAmount(personalDeduction);
//        } else {
//            dto.setPersonalDeductionAmount(BigDecimal.ZERO);
//        }
//
//        // 2.2 Giảm trừ gia cảnh phụ thuộc
//        BigDecimal dependentDeduction = BigDecimal.ZERO;
//        if (taxProfile.getIsEligibleForDependentDeduction() && taxProfile.getNumberOfDependents() > 0) {
//            BigDecimal deductionPerPerson = taxDeductionService.getDependentDeduction(payrollMonth);
//            dependentDeduction = deductionPerPerson.multiply(new BigDecimal(taxProfile.getNumberOfDependents()));
//            dto.setDependentDeductionAmount(dependentDeduction);
//        } else {
//            dto.setDependentDeductionAmount(BigDecimal.ZERO);
//        }
//
//        // 2.3 Bảo hiểm
//        BigDecimal insuranceDeduction = grossIncome
//                .multiply(taxProfile.getInsuranceRate())
//                .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);
//        dto.setInsuranceDeductionAmount(insuranceDeduction);
//
//        // tinh total giam tru
//        BigDecimal totalDeduction = personalDeduction
//                .add(dependentDeduction)
//                .add(insuranceDeduction);
//        dto.setTotalDeductionAmount(totalDeduction);
//
//        // step4 tinh thu nhap tinh thue
//        BigDecimal taxableIncome = grossIncome.subtract(totalDeduction);
//        if (taxableIncome.compareTo(BigDecimal.ZERO) < 0) {
//            taxableIncome = BigDecimal.ZERO;
//        }
//        dto.setTaxableIncome(taxableIncome);
//
//        // step 5tinhs thue theo bac
//        List<TbTaxBracket> brackets = taxBracketRepository.findByIsActiveTrueOrderByBracketNumber();
//        BigDecimal totalTax = BigDecimal.ZERO;
//
//        for (TbTaxBracket bracket : brackets) {
//            TaxCalculationDTO.TaxBracketDetail bracketDetail = new TaxCalculationDTO.TaxBracketDetail();
//            bracketDetail.setBracketNumber(bracket.getBracketNumber());
//            bracketDetail.setFromIncome(bracket.getFromIncome());
//            bracketDetail.setToIncome(bracket.getToIncome());
//            bracketDetail.setTaxRate(bracket.getTaxRate());
//
//            // Tính thu nhập trong bậc này
//            BigDecimal incomeInBracket = calculateIncomeInBracket(
//                    taxableIncome,
//                    bracket.getFromIncome(),
//                    bracket.getToIncome()
//            );
//
//            bracketDetail.setIncomeInBracket(incomeInBracket);
//
//            // Tính thuế của bậc này
//            BigDecimal taxAmount = incomeInBracket
//                    .multiply(bracket.getTaxRate())
//                    .divide(new BigDecimal("100"), SCALE, RoundingMode.HALF_UP);
//
//            bracketDetail.setTaxAmount(taxAmount);
//            totalTax = totalTax.add(taxAmount);
//
//            // Gán vào DTO tương ứng
//            switch (bracket.getBracketNumber()) {
//                case 1 -> dto.setBracket1(bracketDetail);
//                case 2 -> dto.setBracket2(bracketDetail);
//                case 3 -> dto.setBracket3(bracketDetail);
//                case 4 -> dto.setBracket4(bracketDetail);
//                case 5 -> dto.setBracket5(bracketDetail);
//            }
//        }
//
//        dto.setTotalTax(totalTax.setScale(SCALE, RoundingMode.HALF_UP));
//        dto.setCalculationNote(generateCalculationNote(dto));
//
//        return dto;
//    }
//
////     Tính thu nhập trong một bậc thuế
//    private BigDecimal calculateIncomeInBracket(
//            BigDecimal taxableIncome,
//            BigDecimal fromIncome,
//            BigDecimal toIncome) {
//
//        if (taxableIncome.compareTo(fromIncome) <= 0) {
//            return BigDecimal.ZERO;
//        }
//
//        BigDecimal actualTo = toIncome;
//        if (taxableIncome.compareTo(toIncome) < 0) {
//            actualTo = taxableIncome;
//        }
//
//        return actualTo.subtract(fromIncome);
//    }
//
////    note chi tiết tính toán
//    private String generateCalculationNote(TaxCalculationDTO dto) {
//        StringBuilder note = new StringBuilder();
//        note.append("PERSONAL INCOME TAX CALCULATION 2026:\n");
//        note.append(String.format("1. Gross income: %.0f VND\n", dto.getGrossIncome()));
//        note.append(String.format("2. Personal deduction: %.0f VND\n", dto.getPersonalDeductionAmount()));
//        note.append(String.format("3. Dependent deduction (%d dependents): %.0f VND\n",
//                dto.getNumberOfDependents(), dto.getDependentDeductionAmount()));
//        note.append(String.format("4. Insurance (%.1f%%): %.0f VND\n",
//                dto.getInsuranceRate(), dto.getInsuranceDeductionAmount()));
//        note.append(String.format("5. Total deductions: %.0f VND\n", dto.getTotalDeductionAmount()));
//        note.append(String.format("6. Taxable income: %.0f VND\n", dto.getTaxableIncome()));
//
//        if (dto.getBracket1() != null && dto.getBracket1().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
//            note.append(String.format("   Bracket 1: %.0f × 5%% = %.0f VND\n",
//                    dto.getBracket1().getIncomeInBracket(), dto.getBracket1().getTaxAmount()));
//        }
//        if (dto.getBracket2() != null && dto.getBracket2().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
//            note.append(String.format("   Bracket 2: %.0f × 10%% = %.0f VND\n",
//                    dto.getBracket2().getIncomeInBracket(), dto.getBracket2().getTaxAmount()));
//        }
//        if (dto.getBracket3() != null && dto.getBracket3().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
//            note.append(String.format("   Bracket 3: %.0f × 20%% = %.0f VND\n",
//                    dto.getBracket3().getIncomeInBracket(), dto.getBracket3().getTaxAmount()));
//        }
//        if (dto.getBracket4() != null && dto.getBracket4().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
//            note.append(String.format("   Bracket 4: %.0f × 30%% = %.0f VND\n",
//                    dto.getBracket4().getIncomeInBracket(), dto.getBracket4().getTaxAmount()));
//        }
//        if (dto.getBracket5() != null && dto.getBracket5().getTaxAmount().compareTo(BigDecimal.ZERO) > 0) {
//            note.append(String.format("   Bracket 5: %.0f × 35%% = %.0f VND\n",
//                    dto.getBracket5().getIncomeInBracket(), dto.getBracket5().getTaxAmount()));
//        }
//
//        note.append(String.format("6. TOTAL TAX: %.0f VND", dto.getTotalTax()));
//
//        return note.toString();
//    }
//
////     Lưu chi tiết tính thuế vào database
//    public void saveTaxCalculation(
//            TbEmployeePayroll employeePayroll,
//            TaxCalculationDTO taxDTO) {
//
//        TbPayrollTaxCalculation taxCalc = new TbPayrollTaxCalculation();
//        taxCalc.setEmployeePayroll(employeePayroll);
//
//        taxCalc.setGrossIncome(taxDTO.getGrossIncome());
//        taxCalc.setInsuranceDeduction(taxDTO.getInsuranceDeductionAmount());
//        taxCalc.setPersonalDeduction(taxDTO.getPersonalDeductionAmount());
//        taxCalc.setDependentDeduction(taxDTO.getDependentDeductionAmount());
//        taxCalc.setTotalDeduction(taxDTO.getTotalDeductionAmount());
//        taxCalc.setTaxableIncome(taxDTO.getTaxableIncome());
//
//        if (taxDTO.getBracket1() != null) taxCalc.setBracket1Tax(taxDTO.getBracket1().getTaxAmount());
//        if (taxDTO.getBracket2() != null) taxCalc.setBracket2Tax(taxDTO.getBracket2().getTaxAmount());
//        if (taxDTO.getBracket3() != null) taxCalc.setBracket3Tax(taxDTO.getBracket3().getTaxAmount());
//        if (taxDTO.getBracket4() != null) taxCalc.setBracket4Tax(taxDTO.getBracket4().getTaxAmount());
//        if (taxDTO.getBracket5() != null) taxCalc.setBracket5Tax(taxDTO.getBracket5().getTaxAmount());
//
//        taxCalc.setTotalTax(taxDTO.getTotalTax());
//        taxCalc.setCalculationDetail(taxDTO.getCalculationNote());
//
//        taxCalculationRepository.save(taxCalc);
//
//        // Cập nhật lại TbEmployeePayroll
//        employeePayroll.setPersonalIncomeTax(taxDTO.getTotalTax());
//        employeePayroll.setTaxDeductionTotal(taxDTO.getTotalDeductionAmount());
//    }
//
//}
