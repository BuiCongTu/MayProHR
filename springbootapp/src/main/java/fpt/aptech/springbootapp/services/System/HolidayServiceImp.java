package fpt.aptech.springbootapp.services.System;

import fpt.aptech.springbootapp.repositories.System.HolidayRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Service
public class HolidayServiceImp implements HolidayService {
    private final HolidayRepository holidayRepository;

    @Autowired
    public HolidayServiceImp(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    public List<LocalDate> getSundaysInMonth(YearMonth yearMonth) {
        List<LocalDate> sundays = new ArrayList<>();
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        LocalDate currentDate = startDate;
        while (!currentDate.isAfter(endDate)) {
            if (currentDate.getDayOfWeek() == DayOfWeek.SUNDAY) {
                sundays.add(currentDate);
            }
            currentDate = currentDate.plusDays(1);
        }
        return sundays;
    }

    public boolean isHoliday(LocalDate date) {
        return holidayRepository.existsByHolidayDate(date);
    }

    public boolean isSundayOrHoliday(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SUNDAY || isHoliday(date);
    }

    @Override
    public boolean isCompensatoryOff(LocalDate date) {
        //Sunday = Holiday => hôm nay thứ 2 nghỉ bù
        if (date == null) return false;
        if (date.getDayOfWeek() != DayOfWeek.MONDAY) return false;

        LocalDate prev = date.minusDays(1);
        return prev.getDayOfWeek() == DayOfWeek.SUNDAY && isHoliday(prev);
    }

    @Override
    public boolean isNonWorkingDay(LocalDate date) {
        return isSundayOrHoliday(date) || isCompensatoryOff(date);
    }

    @Override
    public BigDecimal getOvertimeMultiplier(LocalDate date) {
        if (isNonWorkingDay(date)) {
            return new BigDecimal("2.0");  // 2x lương
        }
        return new BigDecimal("1.5");      // 1.5x lương
    }
}