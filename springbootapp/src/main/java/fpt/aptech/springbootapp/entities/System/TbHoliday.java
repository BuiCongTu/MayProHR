package fpt.aptech.springbootapp.entities.System;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "tbHoliday", indexes = {
        @Index(name = "idx_holiday_date", columnList = "holiday_date")
})
public class TbHoliday {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @NotNull
    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @NotNull
    @Column(name = "holiday_name", length = 255)
    private String holidayName;

    @Column(name = "is_paid")
    private Boolean isPaid = true;

    @Column(name = "note", columnDefinition = "NVARCHAR(500)")
    private String note;

    @ColumnDefault("getdate()")
    @Column(name = "created_at")
    private Instant createdAt;
}