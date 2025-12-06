package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.filter.OvertimeRequestFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeRequestMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeRequestRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.System.NotificationService;
import fpt.aptech.springbootapp.services.System.WebSocketService;
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

@Service
public class OvertimeRequestServiceImpl implements OvertimeRequestService {

    //config
    private static final double MAX_DAILY_OT_HOURS = 4.0;

    private final OvertimeRequestRepository overtimeRequestRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final OvertimeRequestMapper overtimeRequestMapper;
    private final WebSocketService webSocketService;
    private final NotificationService notificationService;
    //private final LineService lineService;
    private final LineRepository lineRepository;

    @Autowired
    public OvertimeRequestServiceImpl(
            OvertimeRequestRepository overtimeRequestRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            OvertimeRequestMapper overtimeRequestMapper,
            WebSocketService webSocketService,
            NotificationService notificationService,
            //LineService lineService,
            LineRepository lineRepository) {
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.overtimeRequestMapper = overtimeRequestMapper;
        this.webSocketService = webSocketService;
        this.notificationService = notificationService;
        //this.lineService = lineService;
        this.lineRepository = lineRepository;
    }

    @Override
    @Transactional
    public void create(TbOvertimeRequest overtimeRequest) {
        if (overtimeRequest == null) {
            throw new IllegalArgumentException("Overtime request cannot be null");
        }

        if (overtimeRequest.getFactoryManager() == null || overtimeRequest.getFactoryManager().getId() == null) {
            throw new IllegalArgumentException("Factory manager is required");
        }
        TbUser factoryManager = userRepository.findById(overtimeRequest.getFactoryManager().getId()).orElse(null);
        if (factoryManager == null) {
            throw new IllegalArgumentException("Factory manager not found");
        }

        //use role name to check: factory manager
        if (!factoryManager.getRole().getName().equalsIgnoreCase("factory manager")) {
            throw new IllegalArgumentException("User is not a factory manager");
        }

        if (overtimeRequest.getDepartment() == null || overtimeRequest.getDepartment().getId() == null) {
            throw new IllegalArgumentException("Department is required");
        }
        if (departmentRepository.findById(overtimeRequest.getDepartment().getId()).isEmpty()) {
            throw new IllegalArgumentException("Department not found");
        }

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

        //default status is pending
        overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.pending);

        if (overtimeRequest.getLineDetails() == null || overtimeRequest.getLineDetails().isEmpty()) {
            throw new IllegalArgumentException("At least one line must be selected with a valid employee count.");
        }

        for (TbOvertimeRequestDetail detail : overtimeRequest.getLineDetails()) {
            if (detail.getNumEmployees() == null || detail.getNumEmployees() <= 0) {
                throw new IllegalArgumentException("Number of employees for line " + detail.getLine().getName() + " must be greater than 0");
            }
            detail.setOvertimeRequest(overtimeRequest);
        }

        overtimeRequest.setCreatedAt(Instant.now());
        TbOvertimeRequest savedRequest = overtimeRequestRepository.save(overtimeRequest);

        //re-fetch for full data
        TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(savedRequest.getId())
                .orElse(savedRequest);

        try {
            // A. Prepare the Data for the Frontend
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);

            // B. Find Factory Directors
            List<TbUser> directors = userRepository.findByRoleName("Factory Director");

            // C. Send Private Notification to each Director
            for (TbUser director : directors) {
                String message = "New Overtime Request #" + fullRequest.getId() +
                        " from " + factoryManager.getFullName() +
                        " is pending your approval.";

                notificationService.sendNotification(director, message, TbNotification.NotificationType.other);
            }

            // D. Global Update (So the FD's list updates automatically)
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

        } catch (Exception e) {
            System.err.println("Failed to broadcast WebSocket notification: " + e.getMessage());
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
    public void update(TbOvertimeRequest overtimeRequest) {
        // Implement update if needed
    }

    @Override
    public void delete(int id) {
        // Implement delete if needed
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
    public OvertimeRequestDTO approveRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if (overtimeRequest != null) {
            // 1. Update Status & Save
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.open);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);

            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId())
                    .orElse(saved);

            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);

            // 2. GLOBAL UPDATE
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            // 3. NOTIFY FACTORY MANAGER
            if (fullRequest.getFactoryManager() != null) {
                String fmMessage = "Your Request #" + fullRequest.getId() + " has been Approved.";
                notificationService.sendNotification(fullRequest.getFactoryManager(), fmMessage, TbNotification.NotificationType.approval);
            }

            // 4. NOTIFY RELEVANT LINE MANAGERS (WITH HIERARCHY SUPPORT)
            if (fullRequest.getLineDetails() != null) {
                // Use a Set to avoid sending duplicate notifications to the same manager
                Set<TbUser> managersToNotify = new HashSet<>();

                for (TbOvertimeRequestDetail detail : fullRequest.getLineDetails()) {
                    if (detail.getLine() != null) {
                        Integer currentLineId = detail.getLine().getId();

                        // HIERARCHY LOGIC: Walk up the tree until we find a line with a Manager
                        List<TbUser> foundManagers = new ArrayList<>();
                        TbLine currentLine = lineRepository.findById(currentLineId).orElse(null);

                        while (currentLine != null && foundManagers.isEmpty()) {
                            foundManagers = userRepository.findByRoleNameAndLineId("Manager", currentLine.getId());

                            if (foundManagers.isEmpty()) {
                                // No manager here, try the parent
                                if (currentLine.getParent() != null) {
                                    currentLine = lineRepository.findById(currentLine.getParent().getId()).orElse(null);
                                } else {
                                    // Reached root with no manager
                                    currentLine = null;
                                }
                            }
                        }

                        managersToNotify.addAll(foundManagers);
                    }
                }

                // Send the actual notifications
                for (TbUser lm : managersToNotify) {
                    String lmMessage = String.format(
                            "Action Required: Request #%d Approved. You have lines under your management that require staffing.",
                            fullRequest.getId()
                    );
                    notificationService.sendNotification(lm, lmMessage, TbNotification.NotificationType.approval);
                }
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    @Transactional
    public OvertimeRequestDTO rejectRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if (overtimeRequest != null) {
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.rejected);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);

            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId())
                    .orElse(saved);

            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);

            // 1. GLOBAL UPDATE
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            // 2. PRIVATE NOTIFICATION
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
            TbOvertimeRequest fullRequest = overtimeRequestRepository.findById(saved.getId())
                    .orElse(saved);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(fullRequest);

            // 1. GLOBAL UPDATE
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }
}