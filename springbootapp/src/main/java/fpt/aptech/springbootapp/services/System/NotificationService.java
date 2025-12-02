package fpt.aptech.springbootapp.services.System;

import fpt.aptech.springbootapp.dtos.System.NotificationDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.repositories.System.NotificationRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final WebSocketService webSocketService;
    private final UserRepository userRepository;

    @Autowired
    public NotificationService(NotificationRepository notificationRepository,
                               WebSocketService webSocketService,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.webSocketService = webSocketService;
        this.userRepository = userRepository;
    }

    @Transactional
    public void sendNotification(TbUser recipient, String message, TbNotification.NotificationType type) {
        if (recipient == null) return;

        // 1. Save to Database
        TbNotification notif = new TbNotification();
        notif.setRecipient(recipient);
        notif.setMessage(message);
        notif.setType(type);
        notif.setSentDate(Instant.now());
        notif.setStatus(TbNotification.NotificationStatus.sent);

        TbNotification saved = notificationRepository.save(notif);

        // 2. Map to DTO
        NotificationDTO dto = new NotificationDTO();
        dto.setId(saved.getId());
        dto.setMessage(saved.getMessage());
        dto.setType(saved.getType().name());
        dto.setStatus(saved.getStatus().name());
        dto.setSentDate(saved.getSentDate());
        dto.setRecipientId(recipient.getId());

        // 3. Broadcast
        webSocketService.sendPrivateNotification(recipient.getEmail(), dto);
    }

    // Helper for simple info messages
    public void sendInfo(TbUser recipient, String message) {
        sendNotification(recipient, message, TbNotification.NotificationType.other);
    }

    @Transactional(readOnly = true)
    public Page<NotificationDTO> getMyNotifications(String userEmail, Pageable pageable) {
        TbUser user = userRepository.findByEmail(userEmail).orElse(null);
        if (user == null) {
            System.out.println("DEBUG: User not found for email: " + userEmail);
            return Page.empty();
        }
        return notificationRepository.findByRecipientId(user.getId(), pageable)
                .map(this::convertToDTO);
    }

    @Transactional
    public void markAsRead(Integer id) {
        TbNotification notif = notificationRepository.findById(id).orElse(null);
        if (notif != null) {
            notif.setStatus(TbNotification.NotificationStatus.read);
            notificationRepository.save(notif);
        }
    }

    @Transactional
    public void markAllAsRead(String userEmail) {
        TbUser user = userRepository.findByEmail(userEmail).orElse(null);
        if (user != null) {
            notificationRepository.markAllAsRead(user.getId());
        }
    }

    private NotificationDTO convertToDTO(TbNotification entity) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(entity.getId());
        dto.setMessage(entity.getMessage());
        dto.setType(entity.getType().name());
        dto.setStatus(entity.getStatus().name());
        dto.setSentDate(entity.getSentDate());
        dto.setRecipientId(entity.getRecipient().getId());
        return dto;
    }
}