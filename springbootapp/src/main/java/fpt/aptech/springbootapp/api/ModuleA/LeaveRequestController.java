package fpt.aptech.springbootapp.api.ModuleA;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
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

    @Autowired
    public LeaveRequestController(LeaveRequestRepository leaveRequestRepo,
                                  UserRepository userRepository) {
        this.leaveRequestRepo = leaveRequestRepo;
        this.userRepository = userRepository;
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