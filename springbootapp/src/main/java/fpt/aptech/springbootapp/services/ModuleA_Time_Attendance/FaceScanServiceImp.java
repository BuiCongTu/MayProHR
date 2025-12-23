package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import fpt.aptech.springbootapp.entities.ModuleA.AttendanceStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import fpt.aptech.springbootapp.entities.Core.TbFaceScanLog;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.AttendanceRepository;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.FaceScanLogRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FaceScanServiceImp implements FaceScanService {

    private final FaceScanLogRepository faceScanLogRepository;
    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final WebClient webClient;

    @Value("${face.confidence.threshold:0.7}")
    private double confidenceThreshold;

    @Autowired
    public FaceScanServiceImp(
            FaceScanLogRepository faceScanLogRepository,
            AttendanceRepository attendanceRepository,
            UserRepository userRepository,
            @Value("${python.face-service.url:http://localhost:5001}") String pythonFaceServiceUrl
    ) {
        this.faceScanLogRepository = faceScanLogRepository;
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.webClient = WebClient.builder()
                .baseUrl(pythonFaceServiceUrl)
                .build();
    }

    @Override
    public TbFaceScanLog scanFaceAndAttendance(String imageBase64, TbFaceScanLog.ScanType scanType) {
        try {
            // Gửi đúng format body cho Python Flask /api/face/recognize
            Map<String, Object> request = new HashMap<>();
            request.put("imageBase64", imageBase64);
            request.put("scanType", scanType != null ? scanType.name() : "CHECK_IN");

            Map<String, Object> responseData = webClient.post()
                    .uri("/api/face/recognize")
                    .bodyValue(request)
                    .exchangeToMono(response
                            -> response.bodyToMono(Map.class)
                            .defaultIfEmpty(new HashMap<>())
                            .map(body -> {
                                body.put("_status", response.statusCode().value());
                                return body;
                            })
                    )
                    .timeout(java.time.Duration.ofSeconds(30))
                    .block();

            TbFaceScanLog scanLog = new TbFaceScanLog();
            scanLog.setScanDate(Instant.now());
            scanLog.setScanType(scanType);
            scanLog.setIsRecognized(false);
            scanLog.setIsMatched(false);

            if (responseData != null) {
                Object statusObj = responseData.get("_status");
                Integer statusCode = statusObj instanceof Number ? ((Number) statusObj).intValue() : 200;

                Boolean success = (Boolean) responseData.get("success");
                Object confObj = responseData.get("confidence");
                Double confidence = confObj instanceof Number ? ((Number) confObj).doubleValue() : null;
                Integer matchedUserId = (Integer) responseData.get("userId");
                Object message = responseData.get("message");

                if (statusCode >= 200 && statusCode < 300 && Boolean.TRUE.equals(success)
                        && confidence != null && confidence >= confidenceThreshold) {
                    scanLog.setIsMatched(true);
                    scanLog.setIsRecognized(true);
                    scanLog.setMatchedConfidence(new BigDecimal(confidence));

                    log.info("Face matched successfully. UserId: {}", matchedUserId);

                    if (matchedUserId != null) {
                        Optional<TbUser> matchedUser = userRepository.findById(matchedUserId);
                        matchedUser.ifPresent(scanLog::setUser);

                        handleAttendance(scanLog, matchedUserId, scanType);
                    }
                } else {
                    // 4xx từ Python (ví dụ: Face not recognized, confidence too low, ambiguous match, ...)
                    // sẽ vào nhánh này và KHÔNG ném exception nữa, chỉ log là không match.
                    log.warn("Face not recognized or below threshold. status={}, success={}, confidence={}, message={}",
                            statusCode, success, confidence, message);
                    scanLog.setIsMatched(false);
                    scanLog.setIsRecognized(false);
                }
            } else {
                scanLog.setIsMatched(false);
                scanLog.setIsRecognized(false);
            }

            TbFaceScanLog saved = faceScanLogRepository.save(scanLog);
            return saved;

        } catch (Exception e) {
            log.error("Error during face scan", e);

            // Save failed scan log
            TbFaceScanLog failedScan = new TbFaceScanLog();
            failedScan.setScanDate(Instant.now());
            failedScan.setScanType(scanType);
            failedScan.setIsMatched(false);
            failedScan.setIsRecognized(false);

            faceScanLogRepository.save(failedScan);
            throw new RuntimeException("Face scan failed: " + e.getMessage());
        }
    }

    // ... existing code ...
    @Override
    public List<TbFaceScanLog> getScanHistoryByUserId(Integer userId) {
        return faceScanLogRepository.findByUserId(userId);
    }

    @Override
    public List<TbFaceScanLog> getFailedScans() {
        return faceScanLogRepository.findByIsMatchedFalse();
    }

    @Override
    public List<TbFaceScanLog> getFaceUpdateHistory(Integer faceId) {
        return faceScanLogRepository.findFaceUpdateHistory(faceId);
    }

    @Override
    public List<TbFaceScanLog> getSuccessfulScansInDay(Integer userId, Instant scanDate) {
        return faceScanLogRepository.findSuccessfulScansInDay(userId, scanDate);
    }

    @Override
    public boolean hasCheckedInToday(Integer userId, Instant scanDate) {
        return faceScanLogRepository.hasCheckedInToday(userId, scanDate);
    }

    @Override
    public TbFaceScanLog getLatestCheckInToday(Integer userId, Instant scanDate) {
        return faceScanLogRepository.findLatestCheckInToday(userId, scanDate);
    }

    @Override
    public TbFaceScanLog getLatestCheckOutToday(Integer userId, Instant scanDate) {
        return faceScanLogRepository.findLatestCheckOutToday(userId, scanDate);
    }

    //create/update TbAttendance for CHECK_IN/CHECK_OUT
    private void handleAttendance(TbFaceScanLog scanLog, Integer userId, TbFaceScanLog.ScanType scanType) {
        try {
            LocalDate today = LocalDate.now(ZoneId.systemDefault());
            LocalTime scanTime = LocalTime.now(ZoneId.systemDefault());

            log.debug("Handling attendance for userId: {}, scanType: {}", userId, scanType);

            Optional<TbUser> user = userRepository.findById(userId);
            if (user.isEmpty()) {
                log.error("User not found: {}", userId);
                return;
            }

            Optional<TbAttendance> existingAttendance = attendanceRepository.findByUserAndDate(user.get(), today);

            if (scanType == TbFaceScanLog.ScanType.CHECK_IN) {
                // Check-in: tạo attendance mới hoặc cập nhật
                TbAttendance attendance = existingAttendance.orElseGet(() -> {
                    TbAttendance newAttendance = new TbAttendance();
                    newAttendance.setUser(user.get());
                    newAttendance.setDate(today);
                    return newAttendance;
                });

                attendance.setTimeIn(scanTime);
                attendance.setStatus(AttendanceStatus.SUCCESS);

                TbAttendance saved = attendanceRepository.save(attendance);
                scanLog.setAttendanceId(saved.getId());

                log.info("Attendance created/updated for CHECK_IN. UserId: {}, Time: {}", userId, scanTime);

            } else if (scanType == TbFaceScanLog.ScanType.CHECK_OUT) {
                // Check-out: update attendance hiện tại
                if (existingAttendance.isPresent()) {
                    TbAttendance attendance = existingAttendance.get();
                    attendance.setTimeOut(scanTime);

                    TbAttendance saved = attendanceRepository.save(attendance);
                    scanLog.setAttendanceId(saved.getId());

                    log.info("Attendance updated for CHECK_OUT. UserId: {}, Time: {}", userId, scanTime);
                } else {
                    log.warn("No existing attendance found for CHECK_OUT. UserId: {}, Date: {}", userId, today);
                }
            }
        } catch (Exception e) {
            log.error("Error handling attendance for userId: {}", userId, e);
        }
    }
}
