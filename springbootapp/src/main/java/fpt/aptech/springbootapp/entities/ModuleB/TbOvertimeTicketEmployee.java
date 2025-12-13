package fpt.aptech.springbootapp.entities.ModuleB;

import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@NoArgsConstructor
@Table(name = "tb_overtime_ticket_employees")
public class TbOvertimeTicketEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "overtime_ticket_id", nullable = false)
    private TbOvertimeTicket overtimeTicket;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private TbUser employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "line_id")
    private TbLine line;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'pending'")
    @Column(name = "status", length = 20)
    private EmployeeOvertimeStatus status = EmployeeOvertimeStatus.pending;

    @Column(name = "ticket_date")
    private LocalDate ticketDate;

    public enum EmployeeOvertimeStatus {
        pending,
        accepted,
        rejected
    }
}