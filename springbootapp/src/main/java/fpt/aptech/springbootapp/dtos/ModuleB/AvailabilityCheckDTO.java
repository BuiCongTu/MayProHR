package fpt.aptech.springbootapp.dtos.ModuleB;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

public class AvailabilityCheckDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private Integer requestId;
        private Integer targetLineId;
        private List<Integer> employeeIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Integer employeeId;
        private boolean available;
        private String reason; // "Weekly Limit", "Time Conflict", "Already Assigned"
    }
}