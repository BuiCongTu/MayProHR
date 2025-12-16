package fpt.aptech.springbootapp.api.ModuleA;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
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
            List<TbLeaveRequest> requests = leaveRequestRepo.findAll();

            if (userId != null) {
                requests = requests.stream()
                        .filter(r -> r.getUser() != null && r.getUser().getId().equals(userId))
                        .toList();
            }

            if (status != null && !status.isBlank()) {
                String statusUpper = status.toUpperCase();
                requests = requests.stream()
                        .filter(r -> r.getStatus() != null && r.getStatus().toString().equals(statusUpper))
                        .toList();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", requests);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching leave requests", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getLeaveRequestById(@PathVariable Integer id) {
        try {
            Optional<TbLeaveRequest> request = leaveRequestRepo.findById(id);

            if (request.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Leave request not found"
                ));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", request.get());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching leave request", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    // Create leave request
    @PostMapping
    public ResponseEntity<Map<String, Object>> createLeaveRequest(@RequestBody TbLeaveRequest request) {
        try {
            if (request.getUser() == null || request.getUser().getId() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "userId is required"
                ));
            }

            if (request.getStartDate() == null || request.getEndDate() == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "startDate and endDate are required"
                ));
            }

            if (request.getStartDate().isAfter(request.getEndDate())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "startDate must be before endDate"
                ));
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
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Leave request not found"
                ));
            }

            TbLeaveRequest leaveRequest = existing.get();

            if (request.getStartDate() != null) {
                leaveRequest.setStartDate(request.getStartDate());
            }
            if (request.getEndDate() != null) {
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
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    // Delete leave request
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteLeaveRequest(@PathVariable Integer id) {
        try {
            Optional<TbLeaveRequest> existing = leaveRequestRepo.findById(id);

            if (existing.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Leave request not found"
                ));
            }

            leaveRequestRepo.deleteById(id);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Leave request deleted successfully");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error deleting leave request", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }

    // Get leave requests by user and date range
    @GetMapping("/by-user/{userId}")
    public ResponseEntity<Map<String, Object>> getLeaveRequestsByUser(
            @PathVariable Integer userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        try {
            List<TbLeaveRequest> requests = leaveRequestRepo.findAll().stream()
                    .filter(r -> r.getUser() != null && r.getUser().getId().equals(userId))
                    .toList();

            if (fromDate != null) {
                LocalDate finalFromDate = fromDate;
                requests = requests.stream()
                        .filter(r -> !r.getStartDate().isBefore(finalFromDate))
                        .toList();
            }

            if (toDate != null) {
                LocalDate finalToDate = toDate;
                requests = requests.stream()
                        .filter(r -> !r.getEndDate().isAfter(finalToDate))
                        .toList();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", userId);
            response.put("count", requests.size());
            response.put("data", requests);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching leave requests by user", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Error: " + e.getMessage()
            ));
        }
    }
}
