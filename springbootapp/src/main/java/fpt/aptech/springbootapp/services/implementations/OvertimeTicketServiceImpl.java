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

    @Autowired
    public OvertimeTicketServiceImpl(OvertimeTicketRepository overtimeTicketRepository,
                                     UserRepository userRepository,
                                     OvertimeRequestRepository overtimeRequestRepository,
                                     LineRepository lineRepository,
                                     OvertimeTicketMapper overtimeTicketMapper,
                                     OvertimeTicketEmployeeRepository overtimeTicketEmployeeRepository,
                                     WebSocketService webSocketService,
                                     NotificationService notificationService) {
        this.overtimeTicketRepository = overtimeTicketRepository;
        this.userRepository = userRepository;
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.lineRepository = lineRepository;
        this.overtimeTicketMapper = overtimeTicketMapper;
        this.overtimeTicketEmployeeRepository = overtimeTicketEmployeeRepository;
        this.webSocketService = webSocketService;
        this.notificationService = notificationService;
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

        // 2. Validate Request
        TbOvertimeRequest request = overtimeRequestRepository.findById(dto.getRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Overtime Request not found"));

        if (request.getStatus() == TbOvertimeRequest.OvertimeRequestStatus.rejected) {
            throw new IllegalArgumentException("Cannot create ticket: The Overtime Request has been rejected.");
        }
        if (request.getStatus() != TbOvertimeRequest.OvertimeRequestStatus.open) {
            throw new IllegalArgumentException("Cannot create ticket: The Request is not Open for submissions.");
        }

        LocalDate requestDate = request.getOvertimeDate();
        LocalDate startOfWeek = requestDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = requestDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 3. Create Ticket Object
        TbOvertimeTicket ticket = new TbOvertimeTicket();
        ticket.setManager(manager);
        ticket.setOvertimeRequest(request);
        ticket.setStatus(OvertimeTicketStatus.pending);
        ticket.setCreatedAt(Instant.now());

        Set<TbOvertimeTicketEmployee> ticketEmployees = new HashSet<>();
        Set<Integer> processedEmployeeIds = new HashSet<>();

        // 4. Process Allocations
        for (LineAllocationDTO allocation : dto.getAllocations()) {
            TbLine line = lineRepository.findById(allocation.getLineId())
                    .orElseThrow(() -> new IllegalArgumentException("Line not found: " + allocation.getLineId()));

            // --- CONSTRAINT: Line Ownership ---
            // We check if the Manager belongs to this Line (instead of checking if the Line points to the Manager)
            if (manager.getLine() == null || !manager.getLine().getId().equals(line.getId())) {
                throw new IllegalArgumentException("Unauthorized: You (" + manager.getFullName() +
                        ") belong to Line '" + (manager.getLine() != null ? manager.getLine().getName() : "None") +
                        "', but are trying to create a ticket for Line '" + line.getName() + "'.");
            }

            // --- LOGIC: Check Quantity Quota (Refill allowed if employees rejected) ---

            // A. Get limit from Request
            TbOvertimeRequestDetail lineDetail = request.getLineDetails().stream()
                    .filter(d -> d.getLine().getId().equals(line.getId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Line " + line.getName() + " is not part of this Overtime Request"));

            // B. Count ACTIVE assignments (Ignore rejected)
            long currentAssignedCount = overtimeTicketRepository.countAssignedEmployeesByLine(request.getId(), line.getId());
            int newAllocationCount = allocation.getEmployeeIds().size();

            // C. Validate Quota
            if (currentAssignedCount + newAllocationCount > lineDetail.getNumEmployees()) {
                long remainingSlots = lineDetail.getNumEmployees() - currentAssignedCount;
                throw new IllegalArgumentException(String.format(
                        "Quota exceeded for %s. Limit: %d. Active: %d. Remaining: %d. You tried to add: %d.",
                        line.getName(), lineDetail.getNumEmployees(), currentAssignedCount, remainingSlots, newAllocationCount
                ));
            }

            // D. Process Employees
            for (Integer empId : allocation.getEmployeeIds()) {
                // Check Duplicate in Payload
                if (processedEmployeeIds.contains(empId)) {
                    throw new IllegalArgumentException("Employee ID " + empId + " is assigned multiple times.");
                }

                // CHECK 1: Is employee already working (ACCEPTED) in this request?
                if (overtimeTicketRepository.isEmployeeWorkingInRequest(request.getId(), empId)) {
                    throw new IllegalArgumentException("Employee ID " + empId + " is already assigned to another ticket in this request.");
                }


                // CHECK 2: Global Conflict (Are they working in ANOTHER request?)
                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        empId,
                        request.getOvertimeDate(),
                        request.getStartTime(),
                        request.getEndTime()) > 0) {

                    // Fetch user name for a helpful error message
                    TbUser conflictUser = userRepository.findById(empId).orElse(null);
                    String name = conflictUser != null ? conflictUser.getFullName() : ("ID " + empId);

                    throw new IllegalArgumentException(String.format(
                            "Conflict: %s is already scheduled for overtime during this time slot (%s - %s on %s).",
                            name, request.getStartTime(), request.getEndTime(), request.getOvertimeDate()
                    ));
                }

                Double currentWeeklyHours = overtimeTicketRepository.getWeeklyOvertimeHours(empId, startOfWeek, endOfWeek);
                if (currentWeeklyHours == null) currentWeeklyHours = 0.0;

                double potentialTotalHours = currentWeeklyHours + request.getOvertimeTime();

                if (potentialTotalHours > MAX_WEEKLY_OT_HOURS) {
                    TbUser otUser = userRepository.findById(empId).orElse(null);
                    String empName = otUser != null ? otUser.getFullName() : ("ID " + empId);
                    throw new IllegalArgumentException(String.format(
                            "Overtime Limit Exceeded: %s has already worked %.1f OT hours this week. Adding %.1f hours would exceed the limit of %.1f hours.",
                            empName, currentWeeklyHours, request.getOvertimeTime(), MAX_WEEKLY_OT_HOURS
                    ));
                }

                processedEmployeeIds.add(empId);

                TbUser employee = userRepository.findById(empId)
                        .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + empId));

                // --- CONSTRAINT: Department Flexibility ---
                // Employee must belong to the same department as the request/manager
                if (!employee.getDepartment().getId().equals(request.getDepartment().getId())) {
                    throw new IllegalArgumentException(String.format(
                            "Employee %s does not belong to the Request's Department (%s).",
                            employee.getFullName(), request.getDepartment().getName()
                    ));
                }

                TbOvertimeTicketEmployee association = new TbOvertimeTicketEmployee();
                association.setOvertimeTicket(ticket);
                association.setLine(line);
                association.setEmployee(employee);
                association.setStatus(TbOvertimeTicketEmployee.EmployeeOvertimeStatus.pending);

                ticketEmployees.add(association);
            }
        }

        if (ticketEmployees.isEmpty()) {
            throw new IllegalArgumentException("Ticket must have at least one employee assigned.");
        }

        ticket.setOvertimeEmployees(ticketEmployees);
        overtimeTicketRepository.save(ticket);
    }

    @Override
    public List<OvertimeInviteDTO> getMobileInvites(Integer userId) {
        List<TbOvertimeTicketEmployee> assignments = overtimeTicketEmployeeRepository.findByEmployeeId(userId);

        return assignments.stream().map(a -> {
            OvertimeInviteDTO dto = new OvertimeInviteDTO();
            dto.setTicketId(a.getOvertimeTicket().getId());
            dto.setStatus(a.getStatus().name());
            dto.setLineName(a.getLine() != null ? a.getLine().getName() : "N/A");

            // Navigate relationships safely
            if (a.getOvertimeTicket().getOvertimeRequest() != null) {
                var req = a.getOvertimeTicket().getOvertimeRequest();
                dto.setOvertimeDate(req.getOvertimeDate());
                dto.setStartTime(req.getStartTime());
                dto.setEndTime(req.getEndTime());
                dto.setHours(req.getOvertimeTime());
                dto.setDepartmentName(req.getDepartment().getName());
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

        if (assignment == null) {
            throw new IllegalArgumentException("Assignment not found for this user.");
        }

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
                        .orElseThrow(() -> new IllegalArgumentException("Line config not found in request"));

                long currentAccepted = overtimeTicketRepository.countAssignedEmployeesByLine(request.getId(), lineId);

                //check line quota
                if (currentAccepted >= lineDetail.getNumEmployees()) {
                    throw new IllegalArgumentException("Shift is full! The quota (" +
                            lineDetail.getNumEmployees() + ") has already been filled by other employees.");
                }

                //global time conflict check
                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        userId,
                        request.getOvertimeDate(),
                        request.getStartTime(),
                        request.getEndTime()) > 0) {

                    throw new IllegalArgumentException("You have already accepted another overtime shift during this time.");
                }
            }

            assignment.setStatus(newStatus);
            overtimeTicketEmployeeRepository.save(assignment);

        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status. Use 'accepted' or 'rejected'.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<AvailabilityCheckDTO.Response> checkAvailability(AvailabilityCheckDTO.Request requestDto) {
        List<AvailabilityCheckDTO.Response> results = new ArrayList<>();

        // 1. Fetch Request Details
        TbOvertimeRequest request = overtimeRequestRepository.findById(requestDto.getRequestId())
                .orElseThrow(() -> new IllegalArgumentException("Request not found"));

        LocalDate requestDate = request.getOvertimeDate();
        LocalDate startOfWeek = requestDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate endOfWeek = requestDate.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 2. Loop through each employee to validate
        for (Integer empId : requestDto.getEmployeeIds()) {
            AvailabilityCheckDTO.Response response = new AvailabilityCheckDTO.Response();
            response.setEmployeeId(empId);
            response.setAvailable(true); // Default to true

            try {
                // CHECK A: Is already accepted in this Request?
                if (overtimeTicketRepository.isEmployeeWorkingInRequest(request.getId(), empId)) {
                    response.setAvailable(false);
                    response.setReason("Already accepted this request");
                    results.add(response);
                    continue;
                }

                // CHECK B: Global Time Conflict (Same time, different request)
                if (overtimeTicketRepository.existsGlobalTimeConflict(
                        empId, requestDate, request.getStartTime(), request.getEndTime()) > 0) {
                    response.setAvailable(false);
                    response.setReason("Time conflict with another ticket");
                    results.add(response);
                    continue;
                }

                // CHECK C: Weekly Hour Limit (12h)
                Double currentWeeklyHours = overtimeTicketRepository.getWeeklyOvertimeHours(empId, startOfWeek, endOfWeek);
                if (currentWeeklyHours == null) currentWeeklyHours = 0.0;

                double potentialTotal = currentWeeklyHours + request.getOvertimeTime();

                if (potentialTotal > MAX_WEEKLY_OT_HOURS) {
                    response.setAvailable(false);
                    String msg = String.format("Weekly limit: %.1f/%.0fh", currentWeeklyHours, MAX_WEEKLY_OT_HOURS);
                    response.setReason(msg);
                    results.add(response);
                    continue;
                }

                //add this when leave request is ready
//                if (leaveRequestRepository.hasApprovedLeaveOnDate(empId, requestDate)) {
//                    response.setAvailable(false);
//                    response.setReason("On Approved Leave");
//                    results.add(response);
//                    continue;
//                }

                // If all pass:
                results.add(response);

            } catch (Exception e) {
                // Fallback for unexpected errors
                response.setAvailable(false);
                response.setReason("Check failed");
                results.add(response);
            }
        }

        return results;
    }
}