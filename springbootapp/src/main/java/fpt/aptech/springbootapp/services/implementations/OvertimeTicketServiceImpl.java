package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.AvailabilityCheckDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.LineAllocationDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.Mobile.OvertimeInviteDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeTicketCreateDTO;
import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeTicketDTO;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicket.OvertimeTicketStatus;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeTicketEmployee;
import fpt.aptech.springbootapp.entities.System.TbNotification;
import fpt.aptech.springbootapp.filter.OvertimeTicketFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeTicketMapper;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeRequestRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketEmployeeRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeTicketRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.services.System.NotificationService;
import fpt.aptech.springbootapp.services.System.WebSocketService;
import fpt.aptech.springbootapp.services.interfaces.LineService;
import fpt.aptech.springbootapp.services.interfaces.OvertimeTicketService;
import fpt.aptech.springbootapp.specifications.OvertimeTicketSpecification;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OvertimeTicketServiceImpl implements OvertimeTicketService {

    //config
    private static final double MAX_WEEKLY_OT_HOURS = 12.0;

    private final OvertimeTicketRepository overtimeTicketRepository;
    private final UserRepository userRepository;
    private final OvertimeRequestRepository overtimeRequestRepository;
    private final LineRepository lineRepository;
    private final OvertimeTicketMapper overtimeTicketMapper;
    private final OvertimeTicketEmployeeRepository overtimeTicketEmployeeRepository;
    private final WebSocketService webSocketService;
    private final NotificationService notificationService;
    private final LineService lineService;

    @Autowired
    public OvertimeTicketServiceImpl(OvertimeTicketRepository overtimeTicketRepository,
                                     UserRepository userRepository,
                                     OvertimeRequestRepository overtimeRequestRepository,
                                     LineRepository lineRepository,
                                     OvertimeTicketMapper overtimeTicketMapper,
                                     OvertimeTicketEmployeeRepository overtimeTicketEmployeeRepository,
                                     WebSocketService webSocketService,
                                     NotificationService notificationService,
                                     LineService lineService) {
        this.overtimeTicketRepository = overtimeTicketRepository;
        this.userRepository = userRepository;
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.lineRepository = lineRepository;
        this.overtimeTicketMapper = overtimeTicketMapper;
        this.overtimeTicketEmployeeRepository = overtimeTicketEmployeeRepository;
        this.webSocketService = webSocketService;
        this.notificationService = notificationService;
        this.lineService = lineService;
    }

    @Override
    public Page<OvertimeTicketDTO> getFilteredTicket(OvertimeTicketFilter filter, Pageable pageable) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TbUser currentUser = userRepository.findByEmail(email).orElse(null);

        if (currentUser != null && currentUser.getRole() != null) {
            String role = currentUser.getRole().getName();

            if ("Manager".equalsIgnoreCase(role)) {
                filter.setManagerId(currentUser.getId());
            }

            if (role.equalsIgnoreCase("Factory Manager") || role.equalsIgnoreCase("FManager") ||
                    role.equalsIgnoreCase("Factory Director") || role.equalsIgnoreCase("FDirector")) {

                filter.setAllowedStatuses(Arrays.asList(
                        TbOvertimeTicket.OvertimeTicketStatus.submitted,
                        TbOvertimeTicket.OvertimeTicketStatus.approved,
                        TbOvertimeTicket.OvertimeTicketStatus.rejected,
                        TbOvertimeTicket.OvertimeTicketStatus.confirmed
                ));
            }

        }

        Specification<TbOvertimeTicket> spec = OvertimeTicketSpecification.build(filter);
        return overtimeTicketRepository.findAll(spec, pageable).map(overtimeTicketMapper::toDTO);
    }

    @Override
    @Transactional
    public OvertimeTicketDTO submitTicket(Integer id) {
        TbOvertimeTicket overtimeTicket = overtimeTicketRepository.findById(id).orElse(null);
        if (overtimeTicket != null) {
            overtimeTicket.setStatus(OvertimeTicketStatus.submitted);
            TbOvertimeTicket saved = overtimeTicketRepository.save(overtimeTicket);
            TbOvertimeTicket fullTicket = overtimeTicketRepository.findById(saved.getId()).orElse(saved);
            OvertimeTicketDTO dto = overtimeTicketMapper.toDTO(fullTicket);

            // A. Global Update (Refresh Lists)
            webSocketService.sendGlobalUpdate("/topic/tickets", dto);

            // B. Notify Factory Manager
            if (fullTicket.getOvertimeRequest() != null && fullTicket.getOvertimeRequest().getFactoryManager() != null) {
                String lmName = fullTicket.getManager().getFullName();

                String message = String.format(
                        "Ticket #%d submitted by %s for Request #%d.",
                        fullTicket.getId(), lmName, fullTicket.getOvertimeRequest().getId()
                );

                notificationService.sendNotification(fullTicket.getOvertimeRequest().getFactoryManager(), message, TbNotification.NotificationType.other);
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime ticket not found");
    }

    //deprecated
    @Override
    public OvertimeTicketDTO confirmTicket(Integer id) {
        TbOvertimeTicket overtimeTicket = overtimeTicketRepository.findById(id).orElse(null);
        if (overtimeTicket != null) {
            overtimeTicket.setStatus(OvertimeTicketStatus.confirmed);
            return overtimeTicketMapper.toDTO(overtimeTicketRepository.save(overtimeTicket));
        }
        throw new IllegalArgumentException("Overtime ticket not found");
    }

    @Override
    @Transactional
    public OvertimeTicketDTO rejectTicket(Integer id, String reason) {
        TbOvertimeTicket overtimeTicket = overtimeTicketRepository.findById(id).orElse(null);
        if (overtimeTicket != null) {
            overtimeTicket.setStatus(OvertimeTicketStatus.rejected);
            overtimeTicket.setReason(reason);
            TbOvertimeTicket saved = overtimeTicketRepository.save(overtimeTicket);

            TbOvertimeTicket fullTicket = overtimeTicketRepository.findById(saved.getId()).orElse(saved);

            OvertimeTicketDTO dto = overtimeTicketMapper.toDTO(fullTicket);

            // A. Global Update
            webSocketService.sendGlobalUpdate("/topic/tickets", dto);

            // B. Notify Line Manager
            if (fullTicket.getManager() != null) {
                String message = "Your Ticket #" + fullTicket.getId() + " was Rejected by Factory Manager. Reason: " + reason;
                notificationService.sendNotification(fullTicket.getManager(), message, TbNotification.NotificationType.rejection);
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime ticket not found");
    }

    @Override
    @Transactional
    public OvertimeTicketDTO approveTicket(Integer id, String reason) {
        TbOvertimeTicket overtimeTicket = overtimeTicketRepository.findById(id).orElse(null);
        if (overtimeTicket != null) {
            overtimeTicket.setStatus(OvertimeTicketStatus.approved);
            overtimeTicket.setReason(reason);
            TbOvertimeTicket saved = overtimeTicketRepository.save(overtimeTicket);

            TbOvertimeTicket fullTicket = overtimeTicketRepository.findById(saved.getId()).orElse(saved);

            OvertimeTicketDTO dto = overtimeTicketMapper.toDTO(fullTicket);

            // A. Global Update
            webSocketService.sendGlobalUpdate("/topic/tickets", dto);

            // B. Notify Line Manager
            if (fullTicket.getManager() != null) {
                String message = "Your Ticket #" + fullTicket.getId() + " has been Approved by Factory Manager.";
                notificationService.sendNotification(fullTicket.getManager(), message, TbNotification.NotificationType.approval);
            }

            return dto;
        }
        throw new IllegalArgumentException("Overtime ticket not found");
    }

    @Override
    public OvertimeTicketDTO getTicketById(Integer id) {
        TbOvertimeTicket ticket = overtimeTicketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found with id: " + id));
        return overtimeTicketMapper.toDTO(ticket);
    }

    //deprecated
    @Override
    public void create(TbOvertimeTicket overtimeTicket) {
        throw new UnsupportedOperationException("Use createTicket(DTO) instead");
    }

    private boolean isEmployeeActiveInRequest(TbOvertimeRequest request, Integer employeeId) {
        if (request.getOvertimeTickets() == null) return false;

        for (TbOvertimeTicket ticket : request.getOvertimeTickets()) {
            // Ignore Rejected Tickets
            if (ticket.getStatus() == OvertimeTicketStatus.rejected) continue;

            if (ticket.getOvertimeEmployees() != null) {
                for (TbOvertimeTicketEmployee emp : ticket.getOvertimeEmployees()) {
                    if (emp.getStatus() == TbOvertimeTicketEmployee.EmployeeOvertimeStatus.rejected) continue;

                    if (emp.getEmployee().getId().equals(employeeId)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // --- MAIN CREATE METHOD ---
    @Override
    @Transactional
    public void createTicket(OvertimeTicketCreateDTO dto) {
        if (dto.getManagerId() == null || dto.getRequestId() == null || dto.getAllocations() == null) {
            throw new IllegalArgumentException("Missing required fields");
        }

        // 1. Validate Manager
        TbUser manager = userRepository.findById(dto.getManagerId())
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));

        if (!manager.getRole().getName().equalsIgnoreCase("manager")) {
            throw new IllegalArgumentException("User is not a manager");
        }
        if (manager.getLine() == null) {
            throw new IllegalArgumentException("Manager is not assigned to any line.");
        }

        // 2. Validate Request
        TbOvertimeRequest request = overtimeRequestRepository.findById(dto.getRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Overtime Request not found"));

        if (request.getStatus() == TbOvertimeRequest.OvertimeRequestStatus.rejected) {
            throw new IllegalArgumentException("Cannot create ticket: The Overtime Request has been rejected.");
        }
        if (request.getStatus() != TbOvertimeRequest.OvertimeRequestStatus.open) {
            throw new IllegalArgumentException("Cannot create ticket: The Request is not Open for submissions.");
        }

        // Allowed Lines Scope
        Set<Integer> allowedLineIds = request.getLineDetails().stream()
                .map(detail -> detail.getLine().getId())
                .collect(Collectors.toSet());

        // Time calculations for limits
        LocalDate requestDate = request.getOvertimeDate();
        LocalDate startOfWeek = requestDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = requestDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 3. Create Ticket Object
        TbOvertimeTicket ticket = new TbOvertimeTicket();
        ticket.setManager(manager);
        ticket.setOvertimeRequest(request);
        ticket.setStatus(OvertimeTicketStatus.submitted);
        ticket.setCreatedAt(Instant.now());

        Set<TbOvertimeTicketEmployee> ticketEmployees = new HashSet<>();
        Set<Integer> processedEmployeeIds = new HashSet<>();

        // 4. Process Allocations
        for (LineAllocationDTO allocation : dto.getAllocations()) {
            TbLine targetLine = lineRepository.findById(allocation.getLineId())
                    .orElseThrow(() -> new IllegalArgumentException("Target line not found: " + allocation.getLineId()));

            // HIERARCHY CHECK 1: POWER RULE
            if (!lineService.isAncestor(manager.getLine().getId(), targetLine.getId())) {
                throw new IllegalArgumentException("Unauthorized: You (" + manager.getLine().getName() +
                        ") cannot create tickets for line " + targetLine.getName() + " because it is not under your hierarchy.");
            }

            // HIERARCHY CHECK 2: SCOPE RULE
            if (!allowedLineIds.contains(targetLine.getId())) {
                throw new IllegalArgumentException("Line " + targetLine.getName() + " is not included in this Overtime Request.");
            }

            // Quota Check
            TbOvertimeRequestDetail lineDetail = request.getLineDetails().stream()
                    .filter(d -> d.getLine().getId().equals(targetLine.getId()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Detail not found after scope check"));

            long currentAssignedCount = overtimeTicketRepository.countAssignedEmployeesByLine(request.getId(), targetLine.getId());
            int newAllocationCount = allocation.getEmployeeIds().size();
            int maxAllowed = lineDetail.getNumEmployees() * 2;

            if (currentAssignedCount + newAllocationCount > maxAllowed) {
                long remainingSlots = maxAllowed - currentAssignedCount;
                throw new IllegalArgumentException("Invitation limit exceeded for " + targetLine.getName() + ". Remaining: " + remainingSlots);
            }

            // D. Process Employees
            for (Integer empId : allocation.getEmployeeIds()) {
                if (processedEmployeeIds.contains(empId)) {
                    throw new IllegalArgumentException("Employee ID " + empId + " is assigned multiple times in this ticket.");
                }

                // Robust Check: Is employee in ANY active ticket for this request?
                if (isEmployeeActiveInRequest(request, empId)) {
                    throw new IllegalArgumentException("Employee ID " + empId + " is already assigned to another ticket in this request.");
                }

                // Global Conflict Check
                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        empId, request.getOvertimeDate(), request.getStartTime(), request.getEndTime()) > 0) {
                    throw new IllegalArgumentException("Conflict: Employee " + empId + " is already scheduled elsewhere.");
                }

                // Weekly Limit Check
                Double currentWeeklyHours = overtimeTicketRepository.getWeeklyOvertimeHours(empId, startOfWeek, endOfWeek);
                if (currentWeeklyHours == null) currentWeeklyHours = 0.0;
                double potentialTotalHours = currentWeeklyHours + request.getOvertimeTime();

                if (potentialTotalHours > MAX_WEEKLY_OT_HOURS) {
                    TbUser otUser = userRepository.findById(empId).orElse(null);
                    String empName = otUser != null ? otUser.getFullName() : ("ID " + empId);
                    throw new IllegalArgumentException(String.format(
                            "Limit Exceeded: %s has %.1f OT hours this week. +%.1f exceeds limit of %.0f.",
                            empName, currentWeeklyHours, request.getOvertimeTime(), MAX_WEEKLY_OT_HOURS
                    ));
                }

                // HIERARCHY CHECK 3: TRAFFIC LIGHT
                TbUser employee = userRepository.findById(empId)
                        .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + empId));

                TbLine workerLine = employee.getLine();
                if (workerLine == null) throw new IllegalArgumentException("Employee has no line assigned.");

                Integer targetParentId = lineService.getParentId(targetLine.getId());
                Integer workerParentId = lineService.getParentId(workerLine.getId());

                boolean isNative = workerLine.getId().equals(targetLine.getId());
                boolean isSameFamily = Objects.equals(targetParentId, workerParentId);

                if (isSameFamily) {
                    if (!isNative) {
                        throw new IllegalArgumentException("Sibling Block: Worker " + employee.getFullName() +
                                " (Line " + workerLine.getName() + ") cannot work for Sibling Line " + targetLine.getName() + ".");
                    }
                } else {
                    boolean isWorkerLineActive = allowedLineIds.contains(workerLine.getId());
                    if (isWorkerLineActive) {
                        throw new IllegalArgumentException("Active Lock: Worker " + employee.getFullName() +
                                " belongs to active line " + workerLine.getName() + ".");
                    }
                }

                processedEmployeeIds.add(empId);

                TbOvertimeTicketEmployee association = new TbOvertimeTicketEmployee();
                association.setOvertimeTicket(ticket);
                association.setLine(targetLine);
                association.setEmployee(employee);
                association.setStatus(TbOvertimeTicketEmployee.EmployeeOvertimeStatus.pending);

                ticketEmployees.add(association);
            }
        }

        if (ticketEmployees.isEmpty()) {
            throw new IllegalArgumentException("Ticket must have at least one employee assigned.");
        }

        ticket.setOvertimeEmployees(ticketEmployees);
        TbOvertimeTicket saved = overtimeTicketRepository.save(ticket);
        submitTicket(saved.getId());
    }

    @Override
    public List<OvertimeInviteDTO> getMobileInvites(Integer userId) {
        List<TbOvertimeTicketEmployee> assignments = overtimeTicketEmployeeRepository.findByEmployeeId(userId);

        return assignments.stream().map(a -> {
            OvertimeInviteDTO dto = new OvertimeInviteDTO();
            dto.setTicketId(a.getOvertimeTicket().getId());
            dto.setStatus(a.getStatus().name());
            dto.setLineName(a.getLine() != null ? a.getLine().getName() : "N/A");

            if (a.getOvertimeTicket().getOvertimeRequest() != null) {
                var req = a.getOvertimeTicket().getOvertimeRequest();
                dto.setOvertimeDate(req.getOvertimeDate());
                dto.setStartTime(req.getStartTime());
                dto.setEndTime(req.getEndTime());
                dto.setHours(req.getOvertimeTime());
                dto.setDepartmentName(req.getDepartment().getName());
                if (a.getLine() != null) {
                    Integer lineId = a.getLine().getId();
                    int max = req.getLineDetails().stream()
                            .filter(d -> d.getLine().getId().equals(lineId))
                            .mapToInt(TbOvertimeRequestDetail::getNumEmployees)
                            .findFirst()
                            .orElse(0);
                    dto.setMaxAttendees(max);

                    // 2. Get Current Count (Accepted only)
                    long current = overtimeTicketRepository.countAssignedEmployeesByLine(req.getId(), lineId);
                    dto.setCurrentAttendees((int) current);
                }
            }
            if (a.getOvertimeTicket().getManager() != null) {
                dto.setManagerName(a.getOvertimeTicket().getManager().getFullName());
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void respondToInvite(Integer userId, Integer ticketId, String statusStr) {
        TbOvertimeTicketEmployee assignment = overtimeTicketEmployeeRepository.findByTicketAndEmployee(ticketId, userId);
        if (assignment == null) throw new IllegalArgumentException("Assignment not found.");

        if (assignment.getOvertimeTicket().getStatus() == TbOvertimeTicket.OvertimeTicketStatus.rejected) {
            throw new IllegalArgumentException("This ticket has been rejected by the manager.");
        }

        try {
            TbOvertimeTicketEmployee.EmployeeOvertimeStatus newStatus =
                    TbOvertimeTicketEmployee.EmployeeOvertimeStatus.valueOf(statusStr.toLowerCase());

            if (newStatus == TbOvertimeTicketEmployee.EmployeeOvertimeStatus.accepted) {
                TbOvertimeRequest request = assignment.getOvertimeTicket().getOvertimeRequest();
                Integer lineId = assignment.getLine().getId();

                TbOvertimeRequestDetail lineDetail = request.getLineDetails().stream()
                        .filter(d -> d.getLine().getId().equals(lineId))
                        .findFirst()
                        .orElseThrow(() -> new IllegalArgumentException("Line config not found"));

                long currentAccepted = overtimeTicketRepository.countAssignedEmployeesByLine(request.getId(), lineId);

                if (currentAccepted >= lineDetail.getNumEmployees()) {
                    throw new IllegalArgumentException("Shift is full!");
                }

                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        userId, request.getOvertimeDate(), request.getStartTime(), request.getEndTime()) > 0) {
                    throw new IllegalArgumentException("You have another overtime shift during this time.");
                }
            }
            assignment.setStatus(newStatus);
            overtimeTicketEmployeeRepository.save(assignment);

            TbOvertimeTicket updatedTicket = overtimeTicketRepository.findById(ticketId).orElse(assignment.getOvertimeTicket());
            OvertimeTicketDTO ticketDTO = overtimeTicketMapper.toDTO(updatedTicket);
            webSocketService.sendGlobalUpdate("/topic/tickets", ticketDTO);

        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailabilityCheckDTO.Response> checkAvailability(AvailabilityCheckDTO.Request requestDto) {
        List<AvailabilityCheckDTO.Response> results = new ArrayList<>();

        TbOvertimeRequest request = overtimeRequestRepository.findById(requestDto.getRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        TbUser manager = userRepository.findByEmail(email).orElse(null);
        boolean performHierarchyChecks = (manager != null && "Manager".equalsIgnoreCase(manager.getRole().getName()) && manager.getLine() != null);

        TbLine targetLine = null;
        if (requestDto.getTargetLineId() != null) {
            targetLine = lineRepository.findById(requestDto.getTargetLineId()).orElse(null);
        }

        Set<Integer> allowedLineIds = request.getLineDetails().stream()
                .map(detail -> detail.getLine().getId())
                .collect(Collectors.toSet());

        LocalDate requestDate = request.getOvertimeDate();
        LocalDate startOfWeek = requestDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = requestDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        for (Integer empId : requestDto.getEmployeeIds()) {
            AvailabilityCheckDTO.Response response = new AvailabilityCheckDTO.Response();
            response.setEmployeeId(empId);
            response.setAvailable(true);

            try {
                if (isEmployeeActiveInRequest(request, empId)) {
                    response.setAvailable(false);
                    response.setReason("Already Assigned in Req");
                    results.add(response);
                    continue;
                }

                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        empId, requestDate, request.getStartTime(), request.getEndTime()) > 0) {
                    response.setAvailable(false);
                    response.setReason("Time Conflict");
                    results.add(response);
                    continue;
                }

                Double currentWeeklyHours = overtimeTicketRepository.getWeeklyOvertimeHours(empId, startOfWeek, endOfWeek);
                if (currentWeeklyHours == null) currentWeeklyHours = 0.0;
                if (currentWeeklyHours + request.getOvertimeTime() > MAX_WEEKLY_OT_HOURS) {
                    response.setAvailable(false);
                    response.setReason("Weekly Limit");
                    results.add(response);
                    continue;
                }

                if (performHierarchyChecks && targetLine != null) {
                    if (!lineService.isAncestor(manager.getLine().getId(), targetLine.getId())) {
                        response.setAvailable(false);
                        response.setReason("Unauthorized");
                        results.add(response);
                        continue;
                    }

                    if (!allowedLineIds.contains(targetLine.getId())) {
                        response.setAvailable(false);
                        response.setReason("Scope Error");
                        results.add(response);
                        continue;
                    }

                    TbUser employee = userRepository.findById(empId).orElse(null);
                    if (employee != null && employee.getLine() != null) {
                        TbLine workerLine = employee.getLine();
                        Integer targetParentId = lineService.getParentId(targetLine.getId());
                        Integer workerParentId = lineService.getParentId(workerLine.getId());

                        boolean isNative = workerLine.getId().equals(targetLine.getId());
                        boolean isSameFamily = Objects.equals(targetParentId, workerParentId);

                        if (isSameFamily) {
                            if (!isNative) {
                                response.setAvailable(false);
                                response.setReason("Sibling Block");
                                results.add(response);
                                continue;
                            }
                        } else {
                            if (allowedLineIds.contains(workerLine.getId())) {
                                response.setAvailable(false);
                                response.setReason("Active Lock");
                                results.add(response);
                                continue;
                            }
                        }
                    }
                }
                results.add(response);
            } catch (Exception e) {
                response.setAvailable(false);
                response.setReason("Error");
                results.add(response);
            }
        }
        return results;
    }
}