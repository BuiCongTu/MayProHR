package fpt.aptech.springbootapp.services.implementations;

import fpt.aptech.springbootapp.dtos.ModuleB.DepartmentDTO;
import fpt.aptech.springbootapp.entities.Core.TbDepartment;
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
//    public List<TbDepartment> findALl() {
//        return departmentRepository.findAll();
//    }
    public List<DepartmentDTO> findALl() {
        return departmentRepository.findAll().stream().map(dept -> {
            DepartmentDTO dto = DepartmentMapper.toDTO(dept);
            //only get employees with role name worker
            if (dept.getUsers() != null) {
                dto.setNumberOfEmployees((int) dept.getUsers().stream()
                        .filter(tbUser -> {
                            if (tbUser.getRole() == null) return false;
                            return "Worker".equalsIgnoreCase(tbUser.getRole().getName());
                        })
                        .count());
            } else {
                dto.setNumberOfEmployees(0);
            }
            return dto;
        }).toList();
    }
}
