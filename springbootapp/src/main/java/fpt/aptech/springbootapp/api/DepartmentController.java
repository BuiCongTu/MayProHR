package fpt.aptech.springbootapp.api;

import java.util.List;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.dtos.ModuleB.DepartmentDTO;
import fpt.aptech.springbootapp.services.interfaces.DepartmentService;

@RestController
@RequestMapping("/api/department")
public class DepartmentController {

    private final DepartmentService departmentService;
    private final DepartmentRepository deptRepo;

    @Autowired
    public DepartmentController(DepartmentService departmentService,
                                DepartmentRepository deptRepo) {
        this.departmentService = departmentService;
        this.deptRepo = deptRepo;
    }

//    @GetMapping("/")
//    @ResponseStatus(code = HttpStatus.OK)
//    public List<DepartmentDTO> getDepartments() {
//        try {
//            return departmentService.findALl();
//        } catch (Exception e) {
//            e.printStackTrace();
//            return null;
//        }
//    }

    @GetMapping
    @ResponseStatus(code = HttpStatus.OK)
    public List<TbDepartment> getDepartments() {
        try {
            List<TbDepartment> departments = deptRepo.findAll();
            return departments;
        } catch (Exception e) {
            e.printStackTrace();
            return List.of();
        }
    }

}
