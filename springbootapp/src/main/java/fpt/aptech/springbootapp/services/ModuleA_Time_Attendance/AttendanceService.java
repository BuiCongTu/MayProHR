package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import fpt.aptech.springbootapp.entities.ModuleA.AttendanceStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fpt.aptech.springbootapp.dto.AttendanceDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.AttendanceRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class AttendanceService {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;

    @Autowired
    public AttendanceService(AttendanceRepository attendanceRepository,
                             UserRepository userRepository) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
    }

    /**
     * Check-in: Tạo attendance record mới
     */
    @Transactional
    public TbAttendance checkIn(Integer userId, Double confidence) {

        TbUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        Optional<TbAttendance> existing = attendanceRepository.findByUserAndDate(user, today);

        if (existing.isPresent() && existing.get().getTimeIn() != null) {
            throw new IllegalStateException("Already checked in today");
        }

        TbAttendance attendance;
        if (existing.isPresent()) {
            attendance = existing.get();
        } else {
            attendance = new TbAttendance();
            attendance.setUser(user);
            attendance.setDate(today);
        }

        attendance.setTimeIn(now);

        LocalTime standardStartTime = LocalTime.of(8, 30);
        LocalTime standardEndTime = LocalTime.of(17, 30);

        if (now.isBefore(standardStartTime)) {
            attendance.setStatus(AttendanceStatus.UNSCHEDULED);
            attendance.setReason("Check-in quá sớm");
        } else if (now.isAfter(standardStartTime) && now.isBefore(standardEndTime)) {
            attendance.setStatus(AttendanceStatus.SUCCESS);
        } else {
            attendance.setStatus(AttendanceStatus.UNSCHEDULED);
            attendance.setReason("Check-in ngoài giờ làm việc");
        }

        attendance = attendanceRepository.save(attendance);

        log.info("Check-in successful - User: {}, Time: {}, Status: {}",
                user.getFullName(),
                attendance.getTimeIn(),
                attendance.getStatus());

        return attendance;
    }

    @Transactional
    public TbAttendance checkOut(Integer userId, Double confidence) {

        TbUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        LocalDate today = LocalDate.now();

        TbAttendance attendance = attendanceRepository
                .findByUserAndDate(user, today)
                .orElseThrow(() -> new IllegalStateException("No check-in record found today"));

        if (attendance.getTimeIn() == null) {
            throw new IllegalStateException("No check-in time found");
        }

        if (attendance.getTimeOut() != null) {
            throw new IllegalStateException("Already checked out today");
        }

        if (attendance.getStatus() == AttendanceStatus.ERROR) {
            throw new IllegalStateException("Invalid check-in status, cannot check-out");
        }

        LocalTime now = LocalTime.now();
        attendance.setTimeOut(now);

        LocalTime standardEndTime = LocalTime.of(17, 30);
        LocalTime otStart = LocalTime.of(17, 31);
        LocalTime otEnd = LocalTime.of(20, 0);

        if (now.isBefore(standardEndTime)) {
            if (attendance.getStatus() == AttendanceStatus.SUCCESS) {
                attendance.setStatus(AttendanceStatus.EARLY_LEAVE);
                attendance.setReason("Check-out sớm");
            }
        } else if (now.isAfter(otStart) && now.isBefore(otEnd)) {
            attendance.setStatus(AttendanceStatus.OVERTIME);
        }

        attendance = attendanceRepository.save(attendance);

        log.info("Check-out successful - User: {}, Time: {}",
                user.getFullName(),
                attendance.getTimeOut());

        return attendance;
    }


    public Optional<TbAttendance> getAttendanceByUserAndDate(Integer userId, LocalDate date) {
        TbUser user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Optional.empty();
        }
        return attendanceRepository.findByUserAndDate(user, date);
    }

    public List<TbAttendance> getAttendanceByDepartmentAndDate(Integer departmentId, LocalDate date) {
        return attendanceRepository.findByUserDepartmentIdAndDate(departmentId, date);
    }

    public List<TbAttendance> getAttendanceByUserAndDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        try {
            return attendanceRepository.findByUserAndDateRangeNative(userId, startDate, endDate);
        } catch (Exception e) {
            log.warn("Native query failed, falling back to JPQL", e);
            TbUser user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return List.of();
            }
            return attendanceRepository.findByUserAndDateBetween(user, startDate, endDate);
        }
    }

    public List<AttendanceDTO> getAttendanceByDateRangeAsDTO(LocalDate startDate, LocalDate endDate, Integer userId) {
        return getAttendanceByDateRangeAsDTO(startDate, endDate, userId, null, null);
    }

    public List<AttendanceDTO> getAttendanceByDateRangeAsDTO(
            LocalDate startDate,
            LocalDate endDate,
            Integer userId,
            Integer departmentId,
            Integer lineId
    ) {
        try {
            final List<Object[]> results = attendanceRepository.findAttendanceDataByFilters(
                    startDate, endDate, userId, departmentId, lineId
            );

            return results.stream().map(row -> {
                LocalDate dateValue = null;
                if (row[5] != null) {
                    if (row[5] instanceof java.sql.Date) {
                        dateValue = ((java.sql.Date) row[5]).toLocalDate();
                    } else if (row[5] instanceof LocalDate) {
                        dateValue = (LocalDate) row[5];
                    }
                }

                LocalTime timeInValue = null;
                if (row[6] != null) {
                    if (row[6] instanceof java.sql.Time) {
                        timeInValue = ((java.sql.Time) row[6]).toLocalTime();
                    } else if (row[6] instanceof LocalTime) {
                        timeInValue = (LocalTime) row[6];
                    }
                }

                LocalTime timeOutValue = null;
                if (row[7] != null) {
                    if (row[7] instanceof java.sql.Time) {
                        timeOutValue = ((java.sql.Time) row[7]).toLocalTime();
                    } else if (row[7] instanceof LocalTime) {
                        timeOutValue = (LocalTime) row[7];
                    }
                }

                // NOTE: native query SELECT có 10 cột => index 0..9
                return AttendanceDTO.builder()
                        .id(row[0] != null ? ((Number) row[0]).intValue() : null)
                        .userId(row[1] != null ? ((Number) row[1]).intValue() : null)
                        .userName((String) row[2])
                        .departmentId(row[3] != null ? ((Number) row[3]).intValue() : null)
                        .departmentName((String) row[4])
                        .date(dateValue)
                        .timeIn(timeInValue)
                        .timeOut(timeOutValue)
                        .status((String) row[8])
                        .reason((String) row[9])
                        .build();
            }).toList();
        } catch (Exception e) {
            log.error("Error fetching attendance as DTO", e);
            return List.of();
        }
    }

}
