package fpt.aptech.springbootapp.dto;

import java.time.*;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceDTO {

    private Integer id;
    private Integer userId;
    private String userName;
    private Integer departmentId;
    private String departmentName;
    private LocalDate date;
    private LocalTime timeIn;
    private LocalTime timeOut;
    private String status;
    private String reason;
}
