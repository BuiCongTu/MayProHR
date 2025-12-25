package fpt.aptech.springbootapp.api;

import fpt.aptech.springbootapp.services.System.DemoTimeService;
import fpt.aptech.springbootapp.services.System.OvertimeAutomationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/automation/demo")
public class OvertimeAutomationController {

    private final OvertimeAutomationService automationService;
    private final DemoTimeService demoTimeService;

    @Autowired
    public OvertimeAutomationController(OvertimeAutomationService automationService, DemoTimeService demoTimeService) {
        this.automationService = automationService;
        this.demoTimeService = demoTimeService;
    }

    /**
     * FREEZE time at a specific moment.
     * Example: POST /api/automation/demo/set-time?datetime=2025-12-20T17:00:00
     */
    @PostMapping("/set-time")
    public ResponseEntity<String> setVirtualTime(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime datetime) {
        demoTimeService.setFixedTime(datetime);
        return ResponseEntity.ok("Time machine activated! System thinks it is: " + datetime);
    }

    /**
     * RESET to real system time.
     */
    @PostMapping("/reset-time")
    public ResponseEntity<String> resetTime() {
        demoTimeService.resetToSystemTime();
        return ResponseEntity.ok("Time machine deactivated. Back to reality.");
    }

    @PostMapping("/trigger-reject-employees")
    public ResponseEntity<String> triggerAutoReject() {
        automationService.autoRejectEmployees();
        return ResponseEntity.ok("Triggered Reject Logic (at " + demoTimeService.getCurrentTime() + ")");
    }

    @PostMapping("/trigger-approve-tickets")
    public ResponseEntity<String> triggerAutoApprove() {
        automationService.autoApproveTickets();
        return ResponseEntity.ok("Triggered Approve Logic (at " + demoTimeService.getCurrentTime() + ")");
    }

    @PostMapping("/trigger-process-requests")
    public ResponseEntity<String> triggerProcess() {
        automationService.autoProcessRequests();
        return ResponseEntity.ok("Triggered Process Logic (at " + demoTimeService.getCurrentTime() + ")");
    }

    @PostMapping("/trigger-expire-requests")
    public ResponseEntity<String> triggerExpire() {
        automationService.autoExpireRequests();
        return ResponseEntity.ok("Triggered Expire Logic (at " + demoTimeService.getCurrentTime() + ")");
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        Map<String, Object> status = new HashMap<>();

        boolean isFixed = demoTimeService.isTimeFixed();
        LocalDateTime virtualNow = LocalDateTime.of(
                demoTimeService.getCurrentDate(),
                demoTimeService.getCurrentTime()
        );

        status.put("timeMachineActive", isFixed);
        status.put("virtualTime", virtualNow.toString());
        status.put("realSystemTime", LocalDateTime.now().toString());

        if (isFixed) {
            status.put("message", "SYSTEM TIME IS FROZEN. Automation will run based on Virtual Time.");
        } else {
            status.put("message", "System is running on real time.");
        }

        return ResponseEntity.ok(status);
    }
}