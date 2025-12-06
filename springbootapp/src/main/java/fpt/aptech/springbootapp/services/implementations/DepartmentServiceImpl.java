package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.DepartmentDTO;
import fpt.aptech.springbootapp.mappers.DepartmentMapper;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.services.interfaces.DepartmentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DepartmentServiceImpl implements DepartmentService {

    private final DepartmentRepository departmentRepository;
    @Autowired
    public DepartmentServiceImpl(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    public List<DepartmentDTO> findALl() {
        return departmentRepository.findAll().stream().map(dept -> {
            DepartmentDTO dto = DepartmentMapper.toDTO(dept);
            //only get employees with role name worker
            if (dept.getUsers() != null) {
                dto.setNumberOfEmployees(dept.getUsers().stream().filter(
                        tbUser -> "Worker".equalsIgnoreCase(tbUser.getRole().getName()))
                        .toList().size());
            } else {
                dto.setNumberOfEmployees(0);
            }
            return dto;
        }).toList();
    }
}
