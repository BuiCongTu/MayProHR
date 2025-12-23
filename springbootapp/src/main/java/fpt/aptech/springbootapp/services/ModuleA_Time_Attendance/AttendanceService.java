package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import fpt.aptech.springbootapp.services.interfaces.LineService;
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
    private final LineService lineService;


    @Autowired
    public AttendanceService(AttendanceRepository attendanceRepository,
            UserRepository userRepository,
                             LineService lineService) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.lineService = lineService;
    }

    /**
     * Check-in: Tạo attendance record mới
     */
    @Transactional
    public TbAttendance checkIn(Integer userId, Double confidence) {
        TbUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        LocalDate today = LocalDate.now();

        // Kiểm tra đã check-in chưa
        Optional<TbAttendance> existing = attendanceRepository
                .findByUserAndDate(user, today);

        if (existing.isPresent() && existing.get().getTimeIn() != null) {
            throw new IllegalStateException("Already checked in today");
        }

        TbAttendance attendance;
        if (existing.isPresent()) {
            // Update existing record
            attendance = existing.get();
        } else {
            // Create new record
            attendance = new TbAttendance();
            attendance.setUser(user);
            attendance.setDate(today);
        }

        attendance.setTimeIn(LocalTime.now());
        attendance.setStatus(TbAttendance.AttendanceStatus.SUCCESS);

        attendance = attendanceRepository.save(attendance);

        log.info("Check-in successful - User: {}, Time: {}", user.getFullName(), attendance.getTimeIn());

        return attendance;
    }

    /**
     * Check-out: Cập nhật time_out
     */
    @Transactional
    public TbAttendance checkOut(Integer userId, Double confidence) {
        TbUser user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        LocalDate today = LocalDate.now();

        // Tìm attendance record hôm nay
        TbAttendance attendance = attendanceRepository
                .findByUserAndDate(user, today)
                .orElseThrow(() -> new IllegalStateException("No check-in record found today. Please check-in first"));

        if (attendance.getTimeIn() == null) {
            throw new IllegalStateException("No check-in time found. Please check-in first");
        }

        if (attendance.getTimeOut() != null) {
            throw new IllegalStateException("Already checked out today");
        }

        attendance.setTimeOut(LocalTime.now());

        // Kiểm tra late (ví dụ: sau 8:30 AM là late)
        if (attendance.getTimeIn().isAfter(LocalTime.of(8, 30))) {
            attendance.setStatus(TbAttendance.AttendanceStatus.LATE);
        }

        attendance = attendanceRepository.save(attendance);

        log.info("Check-out successful - User: {}, Time: {}", user.getFullName(), attendance.getTimeOut());

        return attendance;
    }

    /**
     * Lấy attendance record của user theo ngày
     */
    public Optional<TbAttendance> getAttendanceByUserAndDate(Integer userId, LocalDate date) {
        TbUser user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Optional.empty();
        }
        return attendanceRepository.findByUserAndDate(user, date);
    }

    /**
     * Lấy attendance của department theo ngày
     */
    public List<TbAttendance> getAttendanceByDepartmentAndDate(Integer departmentId, LocalDate date) {
        return attendanceRepository.findByUserDepartmentIdAndDate(departmentId, date);
    }

    /**
     * Lấy attendance history của user trong khoảng thời gian
     */
    public List<TbAttendance> getAttendanceByUserAndDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        try {
            // Try using native query first to avoid enum conversion issues
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

    //Lấy all attendance trong khoảng thời gian, có thể filter by userId
    public List<AttendanceDTO> getAttendanceByDateRangeAsDTO(
            LocalDate startDate,
            LocalDate endDate,
            Integer userId,
            Integer departmentId,
            Integer targetLineId
    ) {
        try {
            List<Object[]> results;

            if (targetLineId != null) {
                List<Integer> descendantIds = lineService.getAllDescendantIds(targetLineId);
                java.util.ArrayList<Integer> allowed = new java.util.ArrayList<>();
                allowed.add(targetLineId);
                if (descendantIds != null && !descendantIds.isEmpty()) {
                    allowed.addAll(descendantIds);
                }

                results = attendanceRepository.findAttendanceDataByFiltersWithLineIds(
                        startDate, endDate, userId, departmentId, allowed
                );
            } else {
                // fallback: giữ logic cũ (không lọc theo line)
                if (userId != null) {
                    results = attendanceRepository.findAttendanceDataByUserAndDateRange(userId, startDate, endDate);
                } else {
                    results = attendanceRepository.findAttendanceDataByDateRange(startDate, endDate);
                }
            }

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
