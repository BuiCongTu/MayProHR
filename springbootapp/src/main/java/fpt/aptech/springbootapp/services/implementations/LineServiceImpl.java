package fpt.aptech.springbootapp.services.implementations;

import java.util.ArrayList;
import java.util.List;

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

    @Autowired
    public LineServiceImpl(LineRepository lineRepository) {
        this.lineRepository = lineRepository;
    }

    @Override
    public List<TbLine> getLinesByDepartment(Integer departmentId) {
        return lineRepository.findByDepartmentId(departmentId);
    }

    //lấy line con
    @Override
    public List<TbLine> getChildLines(Integer parentLineId) {
        // Lấy line cha
        TbLine parentLine = lineRepository.findById(parentLineId)
                .orElseThrow(() -> {
                    return new RuntimeException("Parent line not found with ID: " + parentLineId);
                });

        List<TbLine> children = parentLine.getChildren();

        return children != null ? children : new ArrayList<>();
    }

    @Override
    public List<TbLine> getRootLines(Integer departmentId) {
        return lineRepository.findByDepartmentIdAndParentIsNull(departmentId);
    }

    // lấy toàn bộ lines theo thứ tự phân cấp
    // @Override
    // public List<TbLine> getLineHierarchyByDepartment(Integer departmentId) {
    //     return lineRepository.findLineHierarchyByDepartment(departmentId);
    // }
    // lay path line
    // @Override
    // public List<TbLine> getLinePathToRoot(Integer lineId) {
    //     //kiem tra line co ton tai khong
    //     TbLine line = lineRepository.findById(lineId)
    //             .orElseThrow(() -> {
    //                 return new RuntimeException("Line not found with ID: " + lineId);
    //             });
    //     List<TbLine> path = lineRepository.findPathToRoot(lineId);
    //     return path;
    // }
    // lay toan bo ancestors line
    // @Override
    // public List<TbLine> getLineAncestors(Integer lineId) {
    //     TbLine line = lineRepository.findById(lineId)
    //             .orElseThrow(() -> {
    //                 return new RuntimeException("Line not found with ID: " + lineId);
    //             });
    //     List<TbLine> ancestors = lineRepository.findAncestors(lineId);
    //     List<TbLine> parentOnly = ancestors.stream()
    //             .filter(ancestor -> !ancestor.getId().equals(lineId))
    //             .collect(Collectors.toList());
    //     return parentOnly;
    // }
    // @Override
    // public List<TbLine> getLineByLevel(Integer departmentId, Integer level) {
    //     if (departmentId == null || departmentId <= 0) {
    //         throw new RuntimeException("Invalid department ID");
    //     }
    //     if (level == null || level <= 0) {
    //         throw new RuntimeException("Invalid level");
    //     }
    //     return lineRepository.findByDepartmentIdAndLevel(departmentId, level);
    // }
    // @Override
    // public TbLine getLineTreeByDepartment(Integer departmentId) {
    //     List<TbLine> rootLines = lineRepository.findByDepartmentIdAndParentIsNull(departmentId);
    //     if (rootLines.isEmpty()) {
    //         return null;
    //     }
    //     if (rootLines.size() == 1) {
    //         TbLine rootLine = rootLines.get(0);
    //         // Recursively load children
    //         loadChildrenRecursively(rootLine);
    //         return rootLine;
    //     }
    //     //co nhieu root line
    //     TbLine virtualRoot = new TbLine();
    //     virtualRoot.setId(0);
    //     virtualRoot.setName("All Lines");
    //     virtualRoot.setLevel(0);
    //     virtualRoot.setChildren(rootLines);
    //     //load
    //     rootLines.forEach(this::loadChildrenRecursively);
    //     return virtualRoot;
    // }
    // private void loadChildrenRecursively(TbLine line) {
    //     if (line == null) {
    //         return;
    //     }
    //     if (line.getChildren() == null) {
    //         line.setChildren(new ArrayList<>());
    //     }
    //     for (TbLine child : line.getChildren()) {
    //         loadChildrenRecursively(child);
    //     }
    // }
}
