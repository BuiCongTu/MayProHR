package fpt.aptech.springbootapp.dtos.System;

import lombok.Data;
import java.time.Instant;

@Data
public class NotificationDTO {
    private Integer id;
    private String message;
    private String type;   // "approval", "rejection", "other"
    private String status; // "sent", "read"
    private Instant sentDate;
    private Integer recipientId; // Just ID
}