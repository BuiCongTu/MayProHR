package fpt.aptech.springbootapp.services.ModuleC_Payroll;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.services.System.HolidayService;

@Service
public class AttendanceHolidayService {

    private final HolidayService holidayService;

    @Autowired
    public AttendanceHolidayService(HolidayService holidayService) {
        this.holidayService = holidayService;
    }

    // kiểm tra một tbattendance có rơi vào Chủ nhật hoặc ngày lễ không.
    public boolean isHolidayOrSunday(TbAttendance attendance) {
        LocalDate d = attendance.getDate();
        return holidayService.isSundayOrHoliday(d);
    }

    //có thì mapp
    public List<AttendanceHolidayFlag> toHolidayFlags(List<TbAttendance> attendances) {
        List<AttendanceHolidayFlag> out = new ArrayList<>();
        if (attendances == null) {
            return out;
        }
        for (TbAttendance a : attendances) {
            out.add(new AttendanceHolidayFlag(a.getId(), a.getDate(), isHolidayOrSunday(a)));
        }
        return out;
    }

    public record AttendanceHolidayFlag(Integer attendanceId, LocalDate date, boolean isHolidayOrSunday) {

    }
}
