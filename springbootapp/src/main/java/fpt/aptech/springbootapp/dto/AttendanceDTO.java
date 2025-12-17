package fpt.aptech.springbootapp.dto;

import java.time.*;

import com.fasterxml.jackson.annotation.JsonProperty;
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
    @JsonProperty("timeIn")
    private LocalTime timeIn;

    @JsonProperty("timeOut")
    private LocalTime timeOut;

    private String status;
    private String reason;
}
