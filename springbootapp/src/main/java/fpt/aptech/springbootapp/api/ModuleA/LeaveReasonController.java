package fpt.aptech.springbootapp.api.ModuleA;

import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.LeaveReasonRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/leave-reason")
public class LeaveReasonController {

    private final LeaveReasonRepository leaveReasonRepository;

    public LeaveReasonController(LeaveReasonRepository leaveReasonRepository) {
        this.leaveReasonRepository = leaveReasonRepository;
    }

    @GetMapping
    public ResponseEntity<?> getAll() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", leaveReasonRepository.findAll()
        ));
    }
}

