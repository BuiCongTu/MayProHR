package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.System.TbHoliday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<TbHoliday, Integer> {

    /**
     * Kiểm tra ngày có phải ngày lễ
     */
    boolean existsByHolidayDate(LocalDate holidayDate);

    /**
     * Lấy tất cả ngày lễ trong năm
     */
    List<TbHoliday> findByHolidayDateBetween(LocalDate start, LocalDate end);


}