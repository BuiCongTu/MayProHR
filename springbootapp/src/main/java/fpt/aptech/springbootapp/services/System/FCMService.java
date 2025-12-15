package fpt.aptech.springbootapp.services.System;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

@Service
public class FCMService {

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(
                                new ClassPathResource("firebase-service-account.json").getInputStream()))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("Firebase Application Initialized Successfully");
            }
        } catch (IOException e) {
            System.err.println("Failed to initialize Firebase: " + e.getMessage());
        }
    }

    public void sendNotification(String deviceToken, String title, String body, Map<String, String> data) {
        if (deviceToken == null || deviceToken.isEmpty()) {
            return;
        }

        try {
            // 1. Build the visible notification (Title + Body)
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // 2. Build the message with Token + Notification + Data (for navigation)
            Message.Builder messageBuilder = Message.builder()
                    .setToken(deviceToken)
                    .setNotification(notification);

            if (data != null) {
                messageBuilder.putAllData(data);
            }

            // 3. Send
            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            System.out.println("Sent FCM Message to " + deviceToken.substring(0, 10) + "... | ID: " + response);

        } catch (Exception e) {
            System.err.println("Error sending FCM message: " + e.getMessage());
        }
    }
}