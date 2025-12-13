package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import fpt.aptech.springbootapp.entities.Core.TbFaceScanLog;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbAttendance;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.*;
import fpt.aptech.springbootapp.repositories.*;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

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
            Map<String, String> request = new HashMap<>();
            request.put("image_base64", imageBase64);

            Map<String, Object> responseData = webClient.post()
                    .uri("/api/face/scan")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(java.time.Duration.ofSeconds(30))
                    .onErrorMap(WebClientResponseException.class, ex -> {
                        log.error("Python service error: {}", ex.getMessage());
                        return new RuntimeException("Python service error: " + ex.getMessage());
                    })
                    .block();

            TbFaceScanLog scanLog = new TbFaceScanLog();
            scanLog.setScanDate(Instant.now());
            scanLog.setScanType(scanType);
            scanLog.setIsRecognized(false);
            scanLog.setIsMatched(false);

            if (responseData != null) {
                Integer matchedUserId = (Integer) responseData.get("user_id");
                Double confidence = (Double) responseData.get("confidence");
                Integer faceId = (Integer) responseData.get("face_id");

                if (confidence != null && confidence >= confidenceThreshold) {
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
                    log.warn("Confidence below threshold or null. Confidence: {}", confidence);
                    scanLog.setIsMatched(false);
                }
            } else {
                scanLog.setIsMatched(false);
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
                attendance.setStatus(TbAttendance.AttendanceStatus.SUCCESS);

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