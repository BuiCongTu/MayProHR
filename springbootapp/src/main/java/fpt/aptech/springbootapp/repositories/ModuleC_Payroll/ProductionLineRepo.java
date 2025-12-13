package fpt.aptech.springbootapp.repositories.ModuleC_Payroll;

import fpt.aptech.springbootapp.entities.ModuleC.TbProductionLine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProductionLineRepo extends JpaRepository<TbProductionLine, Integer> {

    @Query("""
        SELECT pl FROM TbProductionLine pl
        WHERE YEAR(pl.production.dop) = YEAR(?1)
        AND MONTH(pl.production.dop) = MONTH(?1)
        AND pl.subline.id = ?2
    """)
    List<TbProductionLine> findByMonthAndSubline(LocalDate month, Integer sublineId);

    @Query("SELECT pl FROM TbProductionLine pl WHERE pl.production.id = :productionId AND pl.subline.id = :sublineId")
    List<TbProductionLine> findByProductionAndSubline(Integer productionId, Integer sublineId);
}