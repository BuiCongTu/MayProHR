package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeTaxProfile;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeTaxProfileRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class EmployeeTaxProfileService {
    private final EmployeeTaxProfileRepo repo;

    @Autowired
    public EmployeeTaxProfileService(EmployeeTaxProfileRepo repo) {
        this.repo = repo;
    }

    //tao hso thue cho nv
    public TbEmployeeTaxProfile getOrCreateTaxProfile(TbUser user) {
        return repo.findByUserId(user.getId())
                .orElseGet(() -> createTaxProfile(user));
    }

    //tao hs moi
    private TbEmployeeTaxProfile createTaxProfile(TbUser user) {
        TbEmployeeTaxProfile profile = new TbEmployeeTaxProfile();
        profile.setUser(user);

        // Kiểm tra điều kiện giảm trừ gia cảnh
        boolean isEligible = isEligibleForPersonalDeduction(user.getHireDate());
        profile.setIsEligibleForPersonalDeduction(isEligible);
        profile.setIsEligibleForDependentDeduction(isEligible);

        // Mặc định 10.5% bảo hiểm (BHXH 8% + BHYT 1.5% + BHTN 1%)
        profile.setInsuranceRate(new java.math.BigDecimal("10.5"));
        profile.setNumberOfDependents(0);

        return repo.save(profile);
    }

    //kiem tra nv cos du dk giam tru gia canh hay khoong > 3 thang
    public boolean isEligibleForPersonalDeduction(LocalDate hireDate) {
        if (hireDate == null) {
            return false;
        }

        LocalDate threeMonthsAfterHire = hireDate.plusMonths(3);
        LocalDate today = LocalDate.now();

        return !today.isBefore(threeMonthsAfterHire);
    }

    //cap nhat so nguoi phu thuoc
    public void updateNumberOfDependents(Integer userId, Integer numberOfDependents) {
        TbEmployeeTaxProfile profile = repo.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Tax profile not found"));

        profile.setNumberOfDependents(numberOfDependents);
        repo.save(profile);
    }



}
