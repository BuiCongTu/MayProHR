package fpt.aptech.springbootapp.services.System;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeTicketDTO;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeRequestMapper;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeTicketMapper;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeRequestRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketEmployeeRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Service
public class OvertimeAutomationService {

    private static final Logger logger = LoggerFactory.getLogger(OvertimeAutomationService.class);

    @Value("${app.overtime.employee.response-cutoff-minutes:5}")
    private int employeeCutoffMinutes;

    @Value("${app.overtime.ticket.auto-approve-minutes:5}")
    private int ticketAutoApproveMinutes;

    @Value("${app.overtime.request.auto-close-hours:0}")
    private int requestAutoCloseHours;

    private final OvertimeTicketEmployeeRepository employeeRepo;
    private final OvertimeTicketRepository ticketRepo;
    private final OvertimeRequestRepository requestRepo;
    private final NotificationService notificationService;
    private final WebSocketService webSocketService;
    private final OvertimeTicketMapper ticketMapper;
    private final OvertimeRequestMapper requestMapper;

    @Autowired
    public OvertimeAutomationService(OvertimeTicketEmployeeRepository employeeRepo,
                                     OvertimeTicketRepository ticketRepo,
                                     OvertimeRequestRepository requestRepo,
                                     NotificationService notificationService,
                                     WebSocketService webSocketService,
                                     OvertimeTicketMapper ticketMapper,
                                     OvertimeRequestMapper requestMapper) {
        this.employeeRepo = employeeRepo;
        this.ticketRepo = ticketRepo;
        this.requestRepo = requestRepo;
        this.notificationService = notificationService;
        this.webSocketService = webSocketService;
        this.ticketMapper = ticketMapper;
        this.requestMapper = requestMapper;
    }

    /**
     * 1. Auto-Reject Pending Employees who haven't responded before shift starts
     * Runs every 5 minutes
     */
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void autoRejectEmployees() {
        LocalDate today = LocalDate.now();
        LocalTime cutoffTime = LocalTime.now().plusMinutes(employeeCutoffMinutes);

        List<TbOvertimeTicketEmployee> staleEmployees = employeeRepo.findPendingEmployeesNearStart(today, cutoffTime);

        if (!staleEmployees.isEmpty()) {
            logger.info("Found {} stale employees to auto-reject.", staleEmployees.size());

            for (TbOvertimeTicketEmployee emp : staleEmployees) {
                emp.setStatus(TbOvertimeTicketEmployee.EmployeeOvertimeStatus.rejected);
                notificationService.sendNotification(emp.getEmployee(),
                        "You were auto-rejected from an overtime shift due to no response.",
                        TbNotification.NotificationType.rejection);
            }

            employeeRepo.saveAll(staleEmployees);

            staleEmployees.stream()
                    .map(e -> e.getOvertimeTicket().getId())
                    .distinct()
                    .forEach(ticketId -> {
                        ticketRepo.findById(ticketId).ifPresent(t -> {
                            OvertimeTicketDTO dto = ticketMapper.toDTO(t);
                            webSocketService.sendGlobalUpdate("/topic/tickets", dto);
                        });
                    });
        }
    }

    /**
     * 2. Auto-Approve Tickets
     * Runs every 10 minutes
     */
    @Scheduled(cron = "0 */10 * * * *")
    @Transactional
    public void autoApproveTickets() {
        LocalDate today = LocalDate.now();
        LocalTime cutoffTime = LocalTime.now().plusMinutes(ticketAutoApproveMinutes);

        List<TbOvertimeTicket> pendingTickets = ticketRepo.findSubmittedTicketsNearStart(today, cutoffTime);

        if (!pendingTickets.isEmpty()) {
            logger.info("Auto-approving {} tickets.", pendingTickets.size());

            for (TbOvertimeTicket ticket : pendingTickets) {
                ticket.setStatus(TbOvertimeTicket.OvertimeTicketStatus.approved);
                ticket.setReason("Auto-approved by System (Shift Imminent)");

                // Notify Manager
                notificationService.sendNotification(ticket.getManager(),
                        "Ticket #" + ticket.getId() + " has been auto-approved as the shift is starting soon.",
                        TbNotification.NotificationType.approval);

                // Notify Director (Optional FY)
                if (ticket.getOvertimeRequest().getFactoryManager() != null) {
                    notificationService.sendNotification(ticket.getOvertimeRequest().getFactoryManager(),
                            "Ticket #" + ticket.getId() + " was auto-approved by system.",
                            TbNotification.NotificationType.other);
                }
            }

            ticketRepo.saveAll(pendingTickets);

            // Broadcast
            pendingTickets.forEach(t -> {
                webSocketService.sendGlobalUpdate("/topic/tickets", ticketMapper.toDTO(t));
            });
        }
    }

    /**
     * 3. Auto-Process Requests (Close them for Payroll)
     * Runs every 30 minutes
     */
    @Scheduled(cron = "0 */30 * * * *")
    @Transactional
    public void autoProcessRequests() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<TbOvertimeRequest> finishedRequests = requestRepo.findFinishedRequests(today, now);

        if (!finishedRequests.isEmpty()) {
            logger.info("Automation: Processing {} finished requests for payroll.", finishedRequests.size());

            for (TbOvertimeRequest req : finishedRequests) {
                req.setStatus(TbOvertimeRequest.OvertimeRequestStatus.processed);

                if (req.getFactoryManager() != null) {
                    notificationService.sendNotification(req.getFactoryManager(),
                            "Request #" + req.getId() + " (Shift ended " + req.getEndTime() + ") has been finalized.",
                            TbNotification.NotificationType.other);
                }
            }
            requestRepo.saveAll(finishedRequests);

            // Broadcast Request Updates
            finishedRequests.forEach(req -> {
                OvertimeRequestDTO dto = requestMapper.toDTO(req);
                webSocketService.sendGlobalUpdate("/topic/requests", dto);
            });
        }
    }
}