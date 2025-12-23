package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.System.TbHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HolidayRepository extends JpaRepository<TbHoliday, Integer> {
    List<TbHoliday> findByHolidayDateBetween(LocalDate start, LocalDate end);

    boolean existsByHolidayDate(LocalDate date);
    Optional<TbHoliday> findFirstByHolidayDate(LocalDate date);

}

