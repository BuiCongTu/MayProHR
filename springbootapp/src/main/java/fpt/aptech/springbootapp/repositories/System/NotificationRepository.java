package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.System.TbNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<TbNotification, Integer> {

    Page<TbNotification> findByRecipientIdOrderBySentDateDesc(Integer recipientId, Pageable pageable);

    // Count unread
    long countByRecipientIdAndStatus(Integer recipientId, TbNotification.NotificationStatus status);

    // Mark all as read
    @Modifying
    @Query("UPDATE TbNotification n SET n.status = 'read' WHERE n.recipient.id = :userId")
    void markAllAsRead(Integer userId);
}