package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.filter.OvertimeRequestFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeRequestMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

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

    @Autowired
    public OvertimeRequestServiceImpl(
            OvertimeRequestRepository overtimeRequestRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            OvertimeRequestMapper overtimeRequestMapper,
            WebSocketService webSocketService,
            NotificationService notificationService) {
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.overtimeRequestMapper = overtimeRequestMapper;
        this.webSocketService = webSocketService;
        this.notificationService = notificationService;
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

        try {
            // A. Prepare the Data for the Frontend
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(savedRequest);

            // B. Find Factory Directors
            List<TbUser> directors = userRepository.findByRole_Name("Factory Director");

            // C. Send Private Notification to each Director
            for (TbUser director : directors) {
                String message = "New Overtime Request #" + savedRequest.getId() +
                        " from " + savedRequest.getFactoryManager().getFullName() +
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
        try{
            TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
            if (overtimeRequest == null) {
                throw new IllegalArgumentException("Overtime request not found");
            }
            return overtimeRequestMapper.toDTO(overtimeRequest);
        }catch (Exception e){
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
        Specification<TbOvertimeRequest> spec = OvertimeRequestSpecification.build(filter);
        return overtimeRequestRepository.findAll(spec, pageable)
                .map(overtimeRequestMapper::toDTO);
    }

    @Override
    public OvertimeRequestDTO approveRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if(overtimeRequest != null){
            // 1. Update Status & Save
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.open);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(saved);

            // 2. GLOBAL UPDATE (Refresh Lists for everyone)
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            // 3. NOTIFY FACTORY MANAGER (The Creator)
            if (saved.getFactoryManager() != null) {
                String fmMessage = "Your Request #" + saved.getId() + " has been Approved.";
                notificationService.sendNotification(saved.getFactoryManager(), fmMessage, TbNotification.NotificationType.approval);
            }

            // 4. NOTIFY RELEVANT LINE MANAGERS (The Assigners)
            if (saved.getLineDetails() != null) {
                for (TbOvertimeRequestDetail detail : saved.getLineDetails()) {
                    if (detail.getLine() != null) {
                        Integer lineId = detail.getLine().getId();

                        List<TbUser> lineManagers = userRepository.findByRole_NameAndLine_Id("Manager", lineId);

                        for (TbUser lm : lineManagers) {
                            String lmMessage = String.format(
                                    "Action Required: Request #%d Approved. Please staff %s (%d employees).",
                                    saved.getId(),
                                    detail.getLine().getName(),
                                    detail.getNumEmployees()
                            );

                            // Send to each Manager found for this line
                            notificationService.sendNotification(lm, lmMessage, TbNotification.NotificationType.approval);
                        }
                    }
                }
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    public OvertimeRequestDTO rejectRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if(overtimeRequest != null){
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.rejected);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(saved);

            // 1. GLOBAL UPDATE
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            // 2. PRIVATE NOTIFICATION
            if (saved.getFactoryManager() != null) {
                String fmUsername = saved.getFactoryManager().getPhone();
                String message = "Your Request #" + saved.getId() + " was Rejected.";
                webSocketService.sendPrivateNotification(fmUsername, message);
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    public OvertimeRequestDTO processRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if(overtimeRequest != null){
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.processed);
            TbOvertimeRequest saved = overtimeRequestRepository.save(overtimeRequest);
            OvertimeRequestDTO dto = overtimeRequestMapper.toDTO(saved);

            // 1. GLOBAL UPDATE
            webSocketService.sendGlobalUpdate("/topic/requests", dto);

            return dto;
        }
        throw new IllegalArgumentException("Overtime request not found");
    }
}