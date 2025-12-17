package fpt.aptech.springbootapp.api.ModuleA;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.dto.AttendanceDTO;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.services.ModuleA_Time_Attendance.AttendanceService;
import fpt.aptech.springbootapp.services.ModuleA_Time_Attendance.FaceRecognitionService;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/attendance")
@Slf4j
public class AttendanceController {

    private final AttendanceService attendanceService;
    private final FaceRecognitionService faceRecognitionService;

    @Autowired
    public AttendanceController(AttendanceService attendanceService,
            FaceRecognitionService faceRecognitionService) {
        this.attendanceService = attendanceService;
        this.faceRecognitionService = faceRecognitionService;
    }

    /**
     * CHECK-IN: Nhân viên chấm công vào ca
     */
    @PostMapping("/checkin")
    public ResponseEntity<Map<String, Object>> checkIn(@RequestBody Map<String, String> request) {
        try {
            String imageBase64 = request.get("imageBase64");

            if (imageBase64 == null || imageBase64.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Image is required"
                ));
            }

            // 1. Nhận diện khuôn mặt
            Map<String, Object> recognitionResult = faceRecognitionService.recognizeFace(imageBase64, "CHECK_IN");

            if (!(Boolean) recognitionResult.get("success")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(recognitionResult);
            }

            Integer userId = (Integer) recognitionResult.get("userId");
            Double confidence = (Double) recognitionResult.get("confidence");

            // 2. Tạo attendance record
            TbAttendance attendance = attendanceService.checkIn(userId, confidence);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Check-in successful");
            response.put("attendanceId", attendance.getId());
            response.put("userId", userId);
            response.put("fullName", attendance.getUser().getFullName());
            response.put("date", attendance.getDate().toString());
            response.put("timeIn", attendance.getTimeIn() != null ? attendance.getTimeIn().toString() : null);
            response.put("status", attendance.getStatus().toString());
            response.put("confidence", confidence);

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Check-in error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Check-in failed: " + e.getMessage()
            ));
        }
    }

    /**
     * CHECK-OUT: Nhân viên chấm công ra ca
     */
    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkOut(@RequestBody Map<String, String> request) {
        try {
            String imageBase64 = request.get("imageBase64");

            if (imageBase64 == null || imageBase64.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Image is required"
                ));
            }

            // 1. Nhận diện khuôn mặt
            Map<String, Object> recognitionResult = faceRecognitionService.recognizeFace(imageBase64, "CHECK_OUT");

            if (!(Boolean) recognitionResult.get("success")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(recognitionResult);
            }

            Integer userId = (Integer) recognitionResult.get("userId");
            Double confidence = (Double) recognitionResult.get("confidence");

            // 2. Update attendance record
            TbAttendance attendance = attendanceService.checkOut(userId, confidence);

            // 3. Tính số giờ làm việc
            long workingMinutes = java.time.Duration.between(
                    attendance.getTimeIn(),
                    attendance.getTimeOut()
            ).toMinutes();
            double workingHours = workingMinutes / 60.0;

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Check-out successful");
            response.put("attendanceId", attendance.getId());
            response.put("userId", userId);
            response.put("fullName", attendance.getUser().getFullName());
            response.put("date", attendance.getDate().toString());
            response.put("timeIn", attendance.getTimeIn().toString());
            response.put("timeOut", attendance.getTimeOut().toString());
            response.put("workingHours", String.format("%.2f", workingHours));
            response.put("status", attendance.getStatus().toString());

            return ResponseEntity.ok(response);

        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            log.error("Check-out error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Check-out failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Đăng ký khuôn mặt cho nhân viên
     */
    @PostMapping("/register-face")
    @PreAuthorize("hasAnyRole('HR', 'Admin')")
    public ResponseEntity<Map<String, Object>> registerFace(@RequestBody Map<String, Object> request) {
        try {
            Integer userId = (Integer) request.get("userId");
            String imageBase64 = (String) request.get("imageBase64");

            if (userId == null || imageBase64 == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "userId and imageBase64 are required"
                ));
            }

            Map<String, Object> result = faceRecognitionService.registerFace(userId, imageBase64);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Face registration error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Registration failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Huấn luyện model
     */
    @PostMapping("/train-model")
    @PreAuthorize("hasAnyRole('HR', 'Admin')")
    public ResponseEntity<Map<String, Object>> trainModel() {
        try {
            Map<String, Object> result = faceRecognitionService.trainModel();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Model training error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Training failed: " + e.getMessage()
            ));
        }
    }

    /**
     * Lịch sử chấm công của nhân viên
     */
    @GetMapping("/history/{userId}")
    public ResponseEntity<Map<String, Object>> getAttendanceHistory(
            @PathVariable Integer userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        try {
            LocalDate targetDate = date != null ? date : LocalDate.now();

            Optional<TbAttendance> attendance = attendanceService.getAttendanceByUserAndDate(userId, targetDate);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", userId);
            response.put("date", targetDate.toString());
            response.put("hasAttendance", attendance.isPresent());

            if (attendance.isPresent()) {
                TbAttendance att = attendance.get();
                response.put("attendance", Map.of(
                        "id", att.getId(),
                        "timeIn", att.getTimeIn() != null ? att.getTimeIn().toString() : null,
                        "timeOut", att.getTimeOut() != null ? att.getTimeOut().toString() : null,
                        "status", att.getStatus().toString()
                ));
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error getting attendance history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/by-month")
    public ResponseEntity<Map<String, Object>> getAttendanceByMonth(
            @RequestParam String month,
            @RequestParam(required = false) Integer userId) {
        try {
            String[] parts = month.split("-");
            if (parts.length != 2) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Invalid month format. Use YYYY-MM"
                ));
            }

            int year = Integer.parseInt(parts[0]);
            int monthNum = Integer.parseInt(parts[1]);

            LocalDate startDate = LocalDate.of(year, monthNum, 1);
            LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

            log.info("Querying attendances têt - startDate: {}, endDate: {}, userId: {}", startDate, endDate, userId);

            java.util.List<AttendanceDTO> attendances = attendanceService.getAttendanceByDateRangeAsDTO(startDate, endDate, userId);

            log.info("Found {} attendance records", attendances.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("month", month);
            response.put("totalRecords", attendances.size());
            response.put("data", attendances.stream().map(att -> {
                Map<String, Object> attMap = new HashMap<>();
                attMap.put("id", att.getId());
                attMap.put("userId", att.getUserId());
                attMap.put("userName", att.getUserName() != null ? att.getUserName() : "");
                attMap.put("departmentId", att.getDepartmentId() != null ? att.getDepartmentId() : "");
                attMap.put("departmentName", att.getDepartmentName() != null ? att.getDepartmentName() : "");
                attMap.put("date", att.getDate() != null ? att.getDate() : "");
                attMap.put("timeIn", att.getTimeIn() != null ? att.getTimeIn() : null);
                attMap.put("timeOut", att.getTimeOut() != null ? att.getTimeOut(): null);
                attMap.put("status", att.getStatus() != null ? att.getStatus().toUpperCase() : "SUCCESS");
                return attMap;
            }).toList());

            return ResponseEntity.ok(response);

        } catch (NumberFormatException e) {
            log.error("Invalid month format: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid month format. Use YYYY-MM"
            ));
        } catch (Exception e) {
            log.error("Error getting attendance by month", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }
}
