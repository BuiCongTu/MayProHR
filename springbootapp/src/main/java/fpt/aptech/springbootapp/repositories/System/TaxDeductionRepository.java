package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.System.TbTaxDeduction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface TaxDeductionRepository extends JpaRepository<TbTaxDeduction, Integer> {

    @Query("""
        SELECT td FROM TbTaxDeduction td
        WHERE td.deductionType = ?1
        AND td.isActive = true
        AND td.applicableFrom <= ?2
        AND (td.applicableTo IS NULL OR td.applicableTo >= ?2)
    """)
    TbTaxDeduction findByDeductionTypeAndDate(String deductionType, LocalDate date);
}