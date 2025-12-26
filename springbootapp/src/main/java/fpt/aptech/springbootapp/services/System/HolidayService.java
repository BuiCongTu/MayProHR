package fpt.aptech.springbootapp.services.System;

import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
public interface HolidayService {

    //Lấy danh sách ngày Chủ Nhật trong tháng
    List<LocalDate> getSundaysInMonth(YearMonth yearMonth);

    //Kiểm tra ngày có phải ngày lễ
    boolean isHoliday(LocalDate date);

    //Kiểm tra ngày có phải ngày Chủ nhật hoặc lễ
    boolean isSundayOrHoliday(LocalDate date);

    // Ngày nghỉ bù
    boolean isCompensatoryOff(LocalDate date);

    // Ngày không phải ngày làm việc
    boolean isNonWorkingDay(LocalDate date);


    //Tính multiplier lương tăng ca
    BigDecimal getOvertimeMultiplier(LocalDate date);
}