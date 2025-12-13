package fpt.aptech.springbootapp.services.System;

import fpt.aptech.springbootapp.entities.System.TbTaxBracket;
import fpt.aptech.springbootapp.repositories.System.TaxBracketRepository;
import lombok.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class TaxBracketService {
    private final TaxBracketRepository taxBracketRepo;

    @Autowired
    public TaxBracketService(TaxBracketRepository taxBracketRepo) {
        this.taxBracketRepo = taxBracketRepo;
    }

    //lay ds bac thue
    public List<TbTaxBracket> getAllActiveBrackets() {
        return taxBracketRepo.findByIsActiveTrueOrderByBracketNumber();
    }

    public void initializeTaxBrackets() {
        taxBracketRepo.deleteAll();

        TbTaxBracket b1 = new TbTaxBracket();
        b1.setBracketNumber(1);
        b1.setFromIncome(new BigDecimal("0"));
        b1.setToIncome(new BigDecimal("10000000"));
        b1.setTaxRate(new BigDecimal("5"));
        b1.setDescription("Bracket 1: 0-10M @ 5%");
        b1.setIsActive(true);
        taxBracketRepo.save(b1);

        TbTaxBracket b2 = new TbTaxBracket();
        b2.setBracketNumber(2);
        b2.setFromIncome(new BigDecimal("10000000"));
        b2.setToIncome(new BigDecimal("30000000"));
        b2.setTaxRate(new BigDecimal("10"));
        b2.setDescription("Bracket 2: 10-30M @ 10%");
        b2.setIsActive(true);
        taxBracketRepo.save(b2);

        TbTaxBracket b3 = new TbTaxBracket();
        b3.setBracketNumber(3);
        b3.setFromIncome(new BigDecimal("30000000"));
        b3.setToIncome(new BigDecimal("60000000"));
        b3.setTaxRate(new BigDecimal("20"));
        b3.setDescription("Bracket 3: 30-60M @ 20%");
        b3.setIsActive(true);
        taxBracketRepo.save(b3);

        TbTaxBracket b4 = new TbTaxBracket();
        b4.setBracketNumber(4);
        b4.setFromIncome(new BigDecimal("60000000"));
        b4.setToIncome(new BigDecimal("100000000"));
        b4.setTaxRate(new BigDecimal("30"));
        b4.setDescription("Bracket 4: 60-100M @ 30%");
        b4.setIsActive(true);
        taxBracketRepo.save(b4);

        TbTaxBracket b5 = new TbTaxBracket();
        b5.setBracketNumber(5);
        b5.setFromIncome(new BigDecimal("100000000"));
        b5.setToIncome(new BigDecimal("999999999999"));
        b5.setTaxRate(new BigDecimal("35"));
        b5.setDescription("Bracket 5: >130M @ 35%");
        b5.setIsActive(true);
        taxBracketRepo.save(b5);
    }
}
