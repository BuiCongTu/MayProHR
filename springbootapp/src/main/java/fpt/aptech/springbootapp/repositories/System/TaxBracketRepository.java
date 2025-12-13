package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.System.TbTaxBracket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaxBracketRepository extends JpaRepository<TbTaxBracket, Integer> {
    List<TbTaxBracket> findByIsActiveTrueOrderByBracketNumber();

}
