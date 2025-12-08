package fpt.aptech.springbootapp.services.implementations;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import fpt.aptech.springbootapp.dtos.response.LineDto;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.services.interfaces.LineService;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@Transactional(readOnly = true)
public class LineServiceImpl implements LineService {

    private final LineRepository lineRepository;
    private final UserRepository userRepository;

    @Autowired
    public LineServiceImpl(LineRepository lineRepository, UserRepository userRepository) {
        this.lineRepository = lineRepository;
        this.userRepository = userRepository;
    }

    @Override
    public List<LineDto> getLinesByDepartment(Integer departmentId) {
        List<TbLine> lines = lineRepository.findByDepartmentId(departmentId);
        List<TbUser> allDeptUsers = userRepository.findByDepartmentId(departmentId);

        // 1. Map Managers (Role = Manager)
        Map<Integer, TbUser> managerMap = allDeptUsers.stream()
                .filter(u -> u.getRole() != null && "Manager".equalsIgnoreCase(u.getRole().getName()))
                .filter(u -> u.getLine() != null)
                .collect(Collectors.toMap(
                        u -> u.getLine().getId(),
                        u -> u,
                        (existing, replacement) -> existing
                ));

        // 2. Count Employees per Line
        Map<Integer, Long> countMap = allDeptUsers.stream()
                .filter(u -> u.getLine() != null)
                .collect(Collectors.groupingBy(
                        u -> u.getLine().getId(),
                        Collectors.counting()
                ));

        // 3. Map Entity -> DTO
        return lines.stream().map(line -> {
            TbUser manager = managerMap.get(line.getId());
            int count = countMap.getOrDefault(line.getId(), 0L).intValue();

            return LineDto.builder()
                    .id(line.getId())
                    .name(line.getName())
                    .level(line.getLevel())
                    .description(line.getDescription())
                    .departmentId(line.getDepartment().getId())
                    .departmentName(line.getDepartment().getName())
                    .parentId(line.getParent() != null ? line.getParent().getId() : null)
                    .managerName(manager != null ? manager.getFullName() : "Not Assigned")
                    .managerId(manager != null ? manager.getId() : null)
                    .totalEmployees(count)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    public List<TbLine> getChildLines(Integer parentLineId) {
        TbLine parentLine = lineRepository.findById(parentLineId)
                .orElseThrow(() -> new RuntimeException("Parent line not found with ID: " + parentLineId));
        List<TbLine> children = parentLine.getChildren();
        return children != null ? children : new ArrayList<>();
    }

    @Override
    public List<TbLine> getRootLines(Integer departmentId) {
        return lineRepository.findByDepartmentIdAndParentIsNull(departmentId);
    }

    @Override
    public boolean isAncestor(Integer ancestorId, Integer childId) {
        if (ancestorId == null || childId == null) return false;
        if (ancestorId.equals(childId)) return true;

        TbLine currentLine = lineRepository.findById(childId).orElse(null);
        while (currentLine != null && currentLine.getParent() != null) {
            TbLine parent = currentLine.getParent();
            if (parent.getId().equals(ancestorId)) return true;
            currentLine = parent;
        }
        return false;
    }

    @Override
    public Integer getParentId(Integer lineId) {
        if (lineId == null) return null;
        TbLine line = lineRepository.findById(lineId).orElse(null);
        if (line != null && line.getParent() != null) {
            return line.getParent().getId();
        }
        return null;
    }

    @Override
    public List<Integer> getAllDescendantIds(Integer parentLineId) {
        List<Integer> descendantIds = new ArrayList<>();
        TbLine parent = lineRepository.findById(parentLineId).orElse(null);
        if (parent != null) {
            collectDescendantIdsRecursively(parent, descendantIds);
        }
        return descendantIds;
    }

    private void collectDescendantIdsRecursively(TbLine current, List<Integer> ids) {
        ids.add(current.getId());
        if (current.getChildren() != null && !current.getChildren().isEmpty()) {
            for (TbLine child : current.getChildren()) {
                collectDescendantIdsRecursively(child, ids);
            }
        }
    }
}