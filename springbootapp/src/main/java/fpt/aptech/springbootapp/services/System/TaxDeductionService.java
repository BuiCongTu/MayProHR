package fpt.aptech.springbootapp.services.System;

import fpt.aptech.springbootapp.entities.System.TbTaxDeduction;
import fpt.aptech.springbootapp.repositories.System.TaxDeductionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;

@Service
public class TaxDeductionService {
    private final TaxDeductionRepository taxDeductionRepo;

    private static final BigDecimal personalDeduction = new BigDecimal("15500000");
    private static final BigDecimal dependentDeduction = new BigDecimal("6200000");

    @Autowired
    public TaxDeductionService(TaxDeductionRepository taxDeductionRepo) {

        this.taxDeductionRepo = taxDeductionRepo;
    }

    //laays muc giam tru gia canh
    public BigDecimal getPersonalDeduction(LocalDate date) {
        TbTaxDeduction deduction = taxDeductionRepo
                .findByDeductionTypeAndDate("PERSONAL", date);

        if (deduction != null) {
            return deduction.getDeductionAmount();
        }
        return personalDeduction;  // Mặc định 15.5M
    }

    //lay giam tru phu thuoc
    public BigDecimal getDependentDeduction(LocalDate date) {
        TbTaxDeduction deduction = taxDeductionRepo
                .findByDeductionTypeAndDate("DEPENDENT", date);

        if (deduction != null) {
            return deduction.getDeductionAmount();
        }
        return dependentDeduction;  // Mặc định 6.2M
    }

    //
    public void initializeTaxDeductions() {
        taxDeductionRepo.deleteAll();
        TbTaxDeduction deduction = new TbTaxDeduction();
        deduction.setDeductionType("PERSONAL");
        deduction.setDeductionAmount(personalDeduction);
        deduction.setDescription("Personal Deduction: 15.5M");
        deduction.setIsActive(true);
        deduction.setApplicableFrom(LocalDate.of(2025, 1, 1));
        deduction.setApplicableTo(LocalDate.of(2025, 12, 31));
        taxDeductionRepo.save(deduction);

        deduction = new TbTaxDeduction();
        deduction.setDeductionType("DEPENDENT");
        deduction.setDeductionAmount(dependentDeduction);
        deduction.setDescription("Dependent Deduction: 6.2M");
        deduction.setIsActive(true);
        deduction.setApplicableFrom(LocalDate.of(2025, 1, 1));
        deduction.setApplicableTo(LocalDate.of(2025, 12, 31));
        taxDeductionRepo.save(deduction);
}


}
