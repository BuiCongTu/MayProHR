package fpt.aptech.springbootapp.api.ModuleA;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.entities.ModuleA.TbLeaveReason;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.LeaveReasonRepository;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/leave-reason")
@RequiredArgsConstructor
public class LeaveReasonController {

    private final LeaveReasonRepository repo;

    @GetMapping
    public Map<String, Object> getAll() {
        List<TbLeaveReason> data = repo.findAll();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", data);
        return res;
    }
}

