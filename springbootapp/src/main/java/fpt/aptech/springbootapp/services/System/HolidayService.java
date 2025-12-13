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
public interface HolidayService {

    //Lấy danh sách ngày Chủ Nhật trong tháng
    List<LocalDate> getSundaysInMonth(YearMonth yearMonth);

    //Kiểm tra ngày có phải ngày lễ
    boolean isHoliday(LocalDate date);

    //Kiểm tra ngày có phải ngày Chủ nhật hoặc lễ
    boolean isSundayOrHoliday(LocalDate date);

    //Tính multiplier lương tăng ca
    BigDecimal getOvertimeMultiplier(LocalDate date);
}