package fpt.aptech.springbootapp.dtos.ModuleB.Mobile;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
public class OvertimeInviteDTO {
    private Integer ticketId;
    private String status; // "pending", "accepted", "rejected"

    // Display Info
    private LocalDate overtimeDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private Double hours;

    // Context Info
    private String departmentName;
    private String managerName;
    private String lineName;

    private Integer currentAttendees;
    private Integer maxAttendees;
}