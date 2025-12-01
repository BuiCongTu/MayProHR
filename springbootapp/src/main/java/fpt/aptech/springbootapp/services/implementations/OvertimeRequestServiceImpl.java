package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.OvertimeRequestDTO;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequest;
import fpt.aptech.springbootapp.entities.ModuleB.TbOvertimeRequestDetail;
import fpt.aptech.springbootapp.filter.OvertimeRequestFilter;
import fpt.aptech.springbootapp.mappers.ModuleB.OvertimeRequestMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.ModuleB.OvertimeRequestRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
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

    @Autowired
    public OvertimeRequestServiceImpl(
            OvertimeRequestRepository overtimeRequestRepository,
            DepartmentRepository departmentRepository,
            UserRepository userRepository,
            OvertimeRequestMapper overtimeRequestMapper) {
        this.overtimeRequestRepository = overtimeRequestRepository;
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
        this.overtimeRequestMapper = overtimeRequestMapper;
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
        overtimeRequestRepository.save(overtimeRequest);
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
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.open);
            return overtimeRequestMapper.toDTO(overtimeRequestRepository.save(overtimeRequest));
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    public OvertimeRequestDTO rejectRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if(overtimeRequest != null){
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.rejected);
            //reason maybe
            return overtimeRequestMapper.toDTO(overtimeRequestRepository.save(overtimeRequest));
        }
        throw new IllegalArgumentException("Overtime request not found");
    }

    @Override
    public OvertimeRequestDTO processRequest(Integer id) {
        TbOvertimeRequest overtimeRequest = overtimeRequestRepository.findById(id).orElse(null);
        if(overtimeRequest != null){
            overtimeRequest.setStatus(TbOvertimeRequest.OvertimeRequestStatus.processed);
            return overtimeRequestMapper.toDTO(overtimeRequestRepository.save(overtimeRequest));
        }
        throw new IllegalArgumentException("Overtime request not found");
    }
}