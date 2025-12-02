package fpt.aptech.springbootapp.repositories.System;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<TbNotification, Integer> {

    @Query("SELECT n FROM TbNotification n WHERE n.recipient.id = :userId")
    Page<TbNotification> findByRecipientId(@Param("userId") Integer userId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM TbNotification n WHERE n.recipient.id = :userId AND n.status = 'sent'")
    long countUnread(@Param("userId") Integer userId);

    // Mark all as read
    @Modifying
    @Query("UPDATE TbNotification n SET n.status = 'read' WHERE n.recipient.id = :userId")
    void markAllAsRead(@Param("userId") Integer userId);
}