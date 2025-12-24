package fpt.aptech.springbootapp.api.ModuleA;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.services.System.NotificationService;


import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveRequest;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.LeaveRequestRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/leave-request")
@Slf4j
public class LeaveRequestController {

    private final LeaveRequestRepository leaveRequestRepo;
    private final UserRepository userRepository;
    private final NotificationService notificationService;


    @Autowired
    public LeaveRequestController(LeaveRequestRepository leaveRequestRepo,
            UserRepository userRepository,
                                  NotificationService notificationService) {
        this.leaveRequestRepo = leaveRequestRepo;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllLeaveRequests(
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String status) {
        try {
            log.info("[LeaveRequestController] getAllLeaveRequests called - userId: {}, status: {}", userId, status);

            List<TbLeaveRequest> requests = leaveRequestRepo.findAllWithDetails();
            log.info("[LeaveRequestController] findAllWithDetails() returned: {} records", requests.size());

            for (TbLeaveRequest lr : requests) {
                Integer deptId = lr.getUser() != null && lr.getUser().getDepartment() != null
                        ? lr.getUser().getDepartment().getId()
                        : null;

                log.info("[LeaveRequestController] Leave Request - ID: {}, User: {}, UserId: {}, DeptId: {}, StartDate: {}, EndDate: {}, Status: {}",
                        lr.getId(),
                        lr.getUser() != null ? lr.getUser().getFullName() : "NULL",
                        lr.getUser() != null ? lr.getUser().getId() : "NULL",
                        deptId,
                        lr.getStartDate(),
                        lr.getEndDate(),
                        lr.getStatus());
            }

            if (userId != null) {
                requests = requests.stream()
                        .filter(r -> r.getUser() != null && r.getUser().getId().equals(userId))
                        .toList();
                log.info("[LeaveRequestController] After userId filter: {} records", requests.size());
            }

            if (status != null && !status.isBlank()) {
                String statusLower = status.toLowerCase();
                requests = requests.stream()
                        .filter(r -> r.getStatus() != null && r.getStatus().toString().toLowerCase().equals(statusLower))
                        .toList();
                log.info("[LeaveRequestController] After status filter: {} records", requests.size());
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("[LeaveRequestController] Error fetching leave requests", e);
            e.printStackTrace();
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getLeaveRequestById(@PathVariable Integer id) {
        try {
            Optional<TbLeaveRequest> request = leaveRequestRepo.findById(id);

            if (request.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Leave request not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", request.get());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching leave request", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Create leave request
    @PostMapping
    public ResponseEntity<Map<String, Object>> createLeaveRequest(@RequestBody TbLeaveRequest request) {
        try {
            if (request.getUser() == null || request.getUser().getId() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "userId is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (request.getStartDate() == null || request.getEndDate() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "startDate and endDate are required");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (request.getStartDate().isAfter(request.getEndDate())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "startDate must be before endDate");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            if (request.getLeaveReason() == null || request.getLeaveReason().getId() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "leaveReason is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            TbUser user = userRepository.findById(request.getUser().getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            request.setUser(user);
            request.setStatus(TbLeaveRequest.LeaveStatus.pending);

            TbLeaveRequest saved = leaveRequestRepo.save(request);

            TbDepartment dept = user.getDepartment();
            if (dept == null || dept.getId() == null) {
                log.warn("[LeaveRequest] Created #{} but userId={} has NO department -> cannot notify FM",
                        saved.getId(), user.getId());
            } else {
                TbUser fm = dept.getManager();

                if (fm == null) {
                    List<TbUser> fms = userRepository.findByDepartmentIdAndRoleName(dept.getId(), "Factory Manager");
                    fm = fms.isEmpty() ? null : fms.get(0);
                    log.warn("[LeaveRequest] DeptId={} has NO manager_id -> fallback find FM by role, found={}",
                            dept.getId(), fm != null);
                }

                if (fm == null) {
                    log.warn("[LeaveRequest] Created #{} but cannot find Factory Manager for deptId={}",
                            saved.getId(), dept.getId());
                } else if (fm.getRole() == null || fm.getRole().getName() == null) {
                    log.warn("[LeaveRequest] DeptId={} manager userId={} has NO role -> cannot notify",
                            dept.getId(), fm.getId());
                } else if (!"Factory Manager".equalsIgnoreCase(fm.getRole().getName())) {
                    log.warn("[LeaveRequest] DeptId={} manager userId={} role='{}' (expected Factory Manager) -> skip notify",
                            dept.getId(), fm.getId(), fm.getRole().getName());
                } else {
                    String msg = String.format(
                            "Leave Request #%d từ %s (%s → %s) cần bạn CONFIRM.",
                            saved.getId(),
                            user.getFullName(),
                            saved.getStartDate(),
                            saved.getEndDate()
                    );
                    notificationService.sendNotification(fm, msg, TbNotification.NotificationType.other);
                    log.info("[LeaveRequest] Notified FM userId={} email={}", fm.getId(), fm.getEmail());
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Leave request created successfully");
            response.put("data", saved);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error creating leave request", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PutMapping("/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirmLeaveRequest(@PathVariable Integer id, Authentication authentication) {
        try {
            TbLeaveRequest lr = leaveRequestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Leave request not found"));

            if (lr.getStatus() != TbLeaveRequest.LeaveStatus.pending) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Chỉ được CONFIRM khi trạng thái là pending"
                ));
            }

            String email = authentication.getName();
            TbUser confirmer = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found: " + email));

            if (confirmer.getRole() == null || confirmer.getRole().getName() == null
                    || !"Factory Manager".equalsIgnoreCase(confirmer.getRole().getName())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                        "success", false,
                        "message", "Only Factory Manager can CONFIRM leave request"
                ));
            }

            lr.setStatus(TbLeaveRequest.LeaveStatus.confirmed);
            lr.setConfirmedBy(confirmer);

            TbLeaveRequest saved = leaveRequestRepo.save(lr);

            TbUser fd = userRepository.findByRoleName("Factory Director").stream().findFirst().orElse(null);
            if (fd != null) {
                String msg = String.format(
                        "Leave Request #%d đã được FM (%s) CONFIRM, cần bạn APPROVE.",
                        saved.getId(),
                        confirmer.getFullName()
                );
                notificationService.sendNotification(fd, msg, TbNotification.NotificationType.other);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Confirmed",
                    "data", saved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    public static class RejectLeaveRequestBody {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    @PutMapping("/{id}/reject")
    public ResponseEntity<Map<String, Object>> rejectLeaveRequest(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            TbLeaveRequest lr = leaveRequestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Leave request not found"));

            if (lr.getStatus() == TbLeaveRequest.LeaveStatus.approved || lr.getStatus() == TbLeaveRequest.LeaveStatus.rejected) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Không được REJECT khi trạng thái là approved/rejected"
                ));
            }

            String email = authentication.getName();
            TbUser actor = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found: " + email));

            String rejectReason = body != null && body.get("rejectReason") != null
                    ? String.valueOf(body.get("rejectReason")).trim()
                    : null;

            if (rejectReason == null || rejectReason.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "rejectReason is required"
                ));
            }

            lr.setStatus(TbLeaveRequest.LeaveStatus.rejected);
            lr.setRejectReason(rejectReason);

            TbLeaveRequest saved = leaveRequestRepo.save(lr);

            TbUser employee = saved.getUser();
            if (employee != null) {
                String msg = String.format("Leave Request #%d đã bị REJECTED. Lý do: %s", saved.getId(), rejectReason);
                notificationService.sendNotification(employee, msg, TbNotification.NotificationType.rejection);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Rejected",
                    "data", saved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    @PutMapping("/{id}/approve")
    public ResponseEntity<Map<String, Object>> approveLeaveRequest(@PathVariable Integer id, Authentication authentication) {
        try {
            TbLeaveRequest lr = leaveRequestRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Leave request not found"));

            if (lr.getStatus() != TbLeaveRequest.LeaveStatus.confirmed) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Chỉ được APPROVE khi trạng thái là confirmed"
                ));
            }

            String email = authentication.getName();
            TbUser approver = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found: " + email));

            lr.setStatus(TbLeaveRequest.LeaveStatus.approved);
            lr.setApprovedBy(approver);

            TbLeaveRequest saved = leaveRequestRepo.save(lr);

            // --- (Optional) Notify Employee ---
            TbUser employee = saved.getUser();
            if (employee != null) {
                String msg = String.format("Leave Request #%d đã được APPROVED.", saved.getId());
                notificationService.sendNotification(employee, msg, TbNotification.NotificationType.approval);
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Approved",
                    "data", saved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    // Update leave request
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateLeaveRequest(
            @PathVariable Integer id,
            @RequestBody TbLeaveRequest request) {
        try {
            Optional<TbLeaveRequest> existing = leaveRequestRepo.findById(id);

            if (existing.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Leave request not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            TbLeaveRequest leaveRequest = existing.get();

            if (request.getStartDate() != null && request.getEndDate() != null) {
                if (request.getStartDate().isAfter(request.getEndDate())) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "startDate must be before endDate");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
                leaveRequest.setStartDate(request.getStartDate());
                leaveRequest.setEndDate(request.getEndDate());
            }
            if (request.getReason() != null) {
                leaveRequest.setReason(request.getReason());
            }
            if (request.getStatus() != null) {
                leaveRequest.setStatus(request.getStatus());
            }

            TbLeaveRequest updated = leaveRequestRepo.save(leaveRequest);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Leave request updated successfully");
            response.put("data", updated);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error updating leave request", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    // Delete leave request
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteLeaveRequest(@PathVariable Integer id) {
        try {
            Optional<TbLeaveRequest> existing = leaveRequestRepo.findById(id);

            if (existing.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Leave request not found");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            leaveRequestRepo.deleteById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Leave request deleted successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error deleting leave request", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/by-month")
    public ResponseEntity<Map<String, Object>> getLeaveRequestByMonth(
            @RequestParam String month,
            @RequestParam Integer departmentId,
            @RequestParam(required = false) Integer userId) {
        try {
            if (departmentId == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "departmentId is required"
                ));
            }

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

            log.info("Querying leave requests - startDate: {}, endDate: {}, departmentId: {}, userId: {}",
                    startDate, endDate, departmentId, userId);

            List<TbLeaveRequest> leaveRequests;
            if (userId != null) {
                // User luôn thuộc department đã chọn (user list FE lấy theo department)
                leaveRequests = leaveRequestRepo.findByUserIdAndDateRange(userId, startDate, endDate);
            } else {
                leaveRequests = leaveRequestRepo.findByDateRangeAndDepartment(startDate, endDate, departmentId);
            }

            log.info("Found {} leave request records", leaveRequests.size());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("month", month);
            response.put("departmentId", departmentId);
            response.put("userId", userId);
            response.put("totalRecords", leaveRequests.size());
            response.put("data", leaveRequests.stream().map(lr -> {
                Map<String, Object> lrMap = new HashMap<>();
                lrMap.put("id", lr.getId());
                lrMap.put("userId", lr.getUser() != null ? lr.getUser().getId() : null);
                lrMap.put("userName", lr.getUser() != null ? lr.getUser().getFullName() : "");
                lrMap.put("departmentId", lr.getUser() != null && lr.getUser().getDepartment() != null
                        ? lr.getUser().getDepartment().getId() : null);
                lrMap.put("departmentName", lr.getUser() != null && lr.getUser().getDepartment() != null
                        ? lr.getUser().getDepartment().getName() : "");
                lrMap.put("startDate", lr.getStartDate() != null ? lr.getStartDate().toString() : "");
                lrMap.put("endDate", lr.getEndDate() != null ? lr.getEndDate().toString() : "");
                lrMap.put("leaveReason", lr.getLeaveReason() != null ? lr.getLeaveReason().toString() : "");
                lrMap.put("type", lr.getType() != null ? lr.getType().toString() : "");
                lrMap.put("reason", lr.getReason() != null ? lr.getReason() : "");
                lrMap.put("status", lr.getStatus() != null ? lr.getStatus().toString() : "pending");
                return lrMap;
            }).toList());

            return ResponseEntity.ok(response);

        } catch (NumberFormatException e) {
            log.error("Invalid month format: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Invalid month format. Use YYYY-MM"
            ));
        } catch (Exception e) {
            log.error("Error getting leave requests by month", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }
}
