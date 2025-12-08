package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.filter.OvertimeRequestFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeRequestMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeRequestRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.System.NotificationService;
import fpt.aptech.springbootapp.services.System.WebSocketService;
import fpt.aptech.springbootapp.services.interfaces.LineService;
import fpt.aptech.springbootapp.services.interfaces.OvertimeRequestService;
import fpt.aptech.springbootapp.specifications.OvertimeRequestSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OvertimeRequestServiceImpl implements OvertimeRequestService {

    private static final double MAX_DAILY_OT_HOURS = 4.0;

    private final OvertimeRequestRepository overtimeRequestRepository;
    private final OvertimeTicketRepository overtimeTicketRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final OvertimeRequestMapper overtimeRequestMapper;
    private final WebSocketService webSocketService;
    private final NotificationService notificationService;
    private final LineService lineService;
    private final LineRepository lineRepository;

    @Autowired
    public OvertimeRequestServiceImpl(
            OvertimeRequestRepository overtimeRequestRepository,
            OvertimeTicketRepository overtimeTicketRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            OvertimeRequestMapper overtimeRequestMapper,
            WebSocketService webSocketService,
            NotificationService notificationService,
            LineService lineService,
            LineRepository lineRepository) {
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.overtimeTicketRepository = overtimeTicketRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.overtimeRequestMapper = overtimeRequestMapper;
        this.webSocketService = webSocketService;
        this.notificationService = notificationService;
        this.lineService = lineService;
        this.lineRepository = lineRepository;
    }

    @Override
    @Transactional
    public void create(TbOvertimeRequest overtimeRequest) {
        if (overtimeRequest == null) {
            throw new IllegalArgumentException("Overtime request cannot be null");
        }

        // --- 1. BASIC VALIDATION & ENTITY POPULATION ---
        if (overtimeRequest.getFactoryManager() == null || overtimeRequest.getFactoryManager().getId() == null) {
            throw new IllegalArgumentException("Factory manager is required");
        }
        TbUser factoryManager = userRepository.findById(overtimeRequest.getFactoryManager().getId())
                .orElseThrow(() -> new IllegalArgumentException("Factory manager not found"));

        if (!factoryManager.getRole().getName().equalsIgnoreCase("factory manager")) {
            throw new IllegalArgumentException("User is not a factory manager");
        }
        overtimeRequest.setFactoryManager(factoryManager);

        if (overtimeRequest.getDepartment() == null || overtimeRequest.getDepartment().getId() == null) {
            throw new IllegalArgumentException("Department is required");
        }
        TbDepartment department = departmentRepository.findById(overtimeRequest.getDepartment().getId())
                .orElseThrow(() -> new IllegalArgumentException("Department not found"));
        overtimeRequest.setDepartment(department);

        // --- 2. TIME VALIDATION ---
        if (overtimeRequest.getOvertimeDate() == null) {
            throw new IllegalArgumentException("Overtime date is required");
        }
        if (overtimeRequest.getOvertimeDate().isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("Cannot create overtime requests for past dates");
        }

        if (overtimeRequest.getStartTime() == null || overtimeRequest.getEndTime() == null) {
            throw new IllegalArgumentException("Start time and End time are required");
        }
        if (!overtimeRequest.getEndTime().isAfter(overtimeRequest.getStartTime())) {
            throw new IllegalArgumentException("End time must be after Start time");
        }

        long minutes = Duration.between(overtimeRequest.getStartTime(), overtimeRequest.getEndTime()).toMinutes();
        double durationInHours = minutes / 60.0;
        if (durationInHours > MAX_DAILY_OT_HOURS) {
            throw new IllegalArgumentException("Overtime duration (" + String.format("%.1f", durationInHours) + "h) exceeds the maximum allowed limit of " + MAX_DAILY_OT_HOURS + " hours per day.");
        }

        // --- 3. LINE VALIDATION & FIX TRANSIENT ERROR ---
        if (overtimeRequest.getLineDetails() == null || overtimeRequest.getLineDetails().isEmpty()) {
            throw new IllegalArgumentException("At least one line must be selected.");
        }

        for (TbOvertimeRequestDetail detail : overtimeRequest.getLineDetails()) {
            if (detail.getNumEmployees() == null || detail.getNumEmployees() <= 0) {
                throw new IllegalArgumentException("Number of employees for line " + detail.getLine().getId() + " must be greater than 0");
            }

            TbLine realLine = lineRepository.findById(detail.getLine().getId())
                    .orElseThrow(() -> new IllegalArgumentException("Line not found with ID: " + detail.getLine().getId()));

            long actualCount = userRepository.countByLineId(realLine.getId());
            if (detail.getNumEmployees() > actualCount) {
                throw new IllegalArgumentException("Capacity Error: Line '" + realLine.getName() + "' only has " + actualCount + " employees, but you requested " + detail.getNumEmployees() + ".");
            }

            detail.setLine(realLine);
            detail.setOvertimeRequest(overtimeRequest);
        }

        // --- 4. SAVE ---
        overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.pending);
        overtimeRequest.setCreatedAt(Instant.now());
        TbOvertimeRequest savedRequest = overtimeRequestRepository.save(overtimeRequest);

        // --- 5. NOTIFY DIRECTORS & WS ---
        TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(savedRequest.getId()).orElse(savedRequest);

        try {
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);

            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            List<TbUser> directors = userRepository.findByRoleName("Factory Director");
            for (TbUser director : directors) {
                String message = "New Overtime Request #" + fullRequest.getId() +
                        " from " + factoryManager.getFullName() +
                        " is pending your approval.";
                notificationService.sendNotification(director, message, TbNotification.NotificationType.other);
            }

        } catch (Exception e) {
            System.err.println("Failed to broadcast notification: " + e.getMessage());
        }
    }

    @Override
    @Transactional
    public OvertimeRequestDTO approveRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if (overtimeRequest != null) {

            Set<Integer> existingLineIds = overtimeRequest.getLineDetails().stream()
                    .map(d -> d.getLine().getId())
                    .collect(Collectors.toSet());

            List<TbOvertimeRequestDetail> newDetails = new ArrayList<>();
            Set<Integer> parentIdsToProcess = new HashSet<>();

            for (TbOvertimeRequestDetail detail : overtimeRequest.getLineDetails()) {
                TbLine line = detail.getLine();
                if (line.getParent() != null) {
                    Integer parentId = line.getParent().getId();
                    parentIdsToProcess.add(parentId);
                }
            }

            for (Integer pid : parentIdsToProcess) {
                TbLine leaderLine = lineRepository.findById(pid).orElse(null);
                if (leaderLine == null) continue;

                if (!existingLineIds.contains(pid)) {
                    TbOvertimeRequestDetail leaderDetail = new TbOvertimeRequestDetail();
                    leaderDetail.setLine(leaderLine);
                    leaderDetail.setNumEmployees(1);
                    leaderDetail.setOvertimeRequest(overtimeRequest);

                    overtimeRequest.getLineDetails().add(leaderDetail);
                    existingLineIds.add(pid);
                }

                List<TbUser> leaders = userRepository.findByRoleNameAndLineId("Leader", pid);
                if (leaders.isEmpty()) continue;
                TbUser leaderUser = leaders.getFirst();

                TbUser lineManager = null;
                if (leaderLine.getParent() != null) {
                    List<TbUser> managers = userRepository.findByRoleNameAndLineId("Manager", leaderLine.getParent().getId());
                    if (!managers.isEmpty()) lineManager = managers.getFirst();
                }
                if (lineManager == null) lineManager = overtimeRequest.getFactoryManager();

                TbOvertimeTicket leaderTicket = new TbOvertimeTicket();
                leaderTicket.setOvertimeRequest(overtimeRequest);
                leaderTicket.setManager(lineManager);
                leaderTicket.setStatus(TbOvertimeTicket.OvertimeTicketStatus.approved);
                leaderTicket.setCreatedAt(Instant.now());
                leaderTicket.setReason("Auto-generated for Section Leader");

                TbOvertimeTicketEmployee ticketEmployee = new TbOvertimeTicketEmployee();
                ticketEmployee.setOvertimeTicket(leaderTicket);
                ticketEmployee.setEmployee(leaderUser);
                ticketEmployee.setLine(leaderLine);
                ticketEmployee.setStatus(TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted);

                leaderTicket.setOvertimeEmployees(new HashSet<>(Collections.singletonList(ticketEmployee)));

                overtimeTicketRepository.save(leaderTicket);

                notificationService.sendNotification(leaderUser,
                        "Overtime Assignment: You have been automatically assigned to supervise Request #" + id,
                        TbNotification.NotificationType.approval);
            }

            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.open);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);

            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId()).orElse(saved);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            if (fullRequest.getFactoryManager() != null) {
                String fmMessage = "Your Request #" + fullRequest.getId() + " has been Approved.";
                notificationService.sendNotification(fullRequest.getFactoryManager(), fmMessage, TbNotification.NotificationType.approval);
            }

            notifyLineManagers(fullRequest);

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    private void notifyLineManagers(TbOvertimeRequest request) {
        if (request.getLineDetails() == null) return;

        Set<TbUser> managersToNotify = new HashSet<>();

        for (TbOvertimeRequestDetail detail : request.getLineDetails()) {
            if (detail.getLine() != null) {
                Integer currentLineId = detail.getLine().getId();
                List<TbUser> foundManagers = new ArrayList<>();
                TbLine currentLine = lineRepository.findById(currentLineId).orElse(null);

                while (currentLine != null && foundManagers.isEmpty()) {
                    foundManagers = userRepository.findByRoleNameAndLineId("Manager", currentLine.getId());

                    if (foundManagers.isEmpty()) {
                        if (currentLine.getParent() != null) {
                            currentLine = lineRepository.findById(currentLine.getParent().getId()).orElse(null);
                        } else {
                            currentLine = null;
                        }
                    }
                }
                managersToNotify.addAll(foundManagers);
            }
        }

        for (TbUser lm : managersToNotify) {
            String lmMessage = String.format(
                    "Action Required: Request #%d Approved. You have lines under your management that require staffing.",
                    request.getId()
            );
            notificationService.sendNotification(lm, lmMessage, TbNotification.NotificationType.approval);
        }
    }

    @Override
    public OvertimeRequestDTO read(int id) {
        try {
            TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
            if (overtimeRequest == null) {
                throw new IllegalArgumentException("Overtime request not found");
            }
            return overtimeRequestMapper.toDTO(overtimeRequest);
        } catch (Exception e) {
            throw new IllegalArgumentException("Overtime request not found");
        }
    }

    @Override
    public List<TbOvertimeRequest> list() {
        try {
            return overtimeRequestRepository.findAll();
        } catch (Exception e) {
            System.out.println(e.getMessage());
        }
        return null;
    }

    @Override
    public Page<OvertimeRequestDTO> getFilteredRequests(OvertimeRequestFilter filter, Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TbUser currentUser = userRepository.findByEmail(email).orElse(null);

        if (currentUser != null && currentUser.getRole() != null) {
            String role = currentUser.getRole().getName();

            if ("Manager".equalsIgnoreCase(role)) {
                if (currentUser.getDepartment() != null) {
                    filter.setDepartmentId(currentUser.getDepartment().getId());
                }
                filter.setAllowedStatuses(Arrays.asList(
                        TbOvertimeRequest.OvertimeRequestStatus.open,
                        TbOvertimeRequest.OvertimeRequestStatus.processed
                ));
            }
        }
        Specification<TbOvertimeRequest> spec = OvertimeRequestSpecification.build(filter);
        return overtimeRequestRepository.findAll(spec, pageable)
                .map(overtimeRequestMapper::toDTO);
    }

    @Override
    @Transactional
    public OvertimeRequestDTO rejectRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if (overtimeRequest != null) {
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.rejected);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);
            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId()).orElse(saved);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            if (fullRequest.getFactoryManager() != null) {
                String message = "Your Request #" + fullRequest.getId() + " was Rejected.";
                notificationService.sendNotification(
                        fullRequest.getFactoryManager(),
                        message,
                        TbNotification.NotificationType.rejection
                );
            }
            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    @Transactional
    public OvertimeRequestDTO processRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if (overtimeRequest != null) {
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.processed);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);
            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId()).orElse(saved);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);
            webSocketService.sendGlobalUpdate("/topic/requests", dto);
            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    public void update(TbOvertimeRequest overtimeRequest) {}

    @Override
    public void delete(int id) {}
}