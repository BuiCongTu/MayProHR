package fpt.aptech.springbootapp.services.System;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    // 1. Broadcast to a public topic (e.g., refreshing a list for everyone)
    public void sendGlobalUpdate(String topic, Object payload) {
        messagingTemplate.convertAndSend(topic, payload);
    }

    // 2. Send to a specific user (e.g., "Your request was approved")
    public void sendPrivateNotification(String username, Object payload) {
        // Sends to: /user/{username}/queue/notifications
        messagingTemplate.convertAndSendToUser(username, "/queue/notifications", payload);
    }
}