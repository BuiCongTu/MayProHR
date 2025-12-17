package fpt.aptech.springbootapp.api.ModuleC;

import java.time.Instant;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.entities.ModuleC.TbEmployeeProduction;
import fpt.aptech.springbootapp.entities.ModuleC.TbProduction;
import fpt.aptech.springbootapp.repositories.UserRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.EmployeeProductionRepo;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionRepo;

@RestController
@RequestMapping("/api/employee-production")
public class EmployeeProductionController {

    private EmployeeProductionRepo employeeProductionRepo;
    private ProductionRepo productionRepo;
    private UserRepository userRepository;

    @Autowired
    public EmployeeProductionController(EmployeeProductionRepo employeeProductionRepo,
            ProductionRepo productionRepo,
            UserRepository userRepository) {
        this.employeeProductionRepo = employeeProductionRepo;
        this.productionRepo = productionRepo;
        this.userRepository = userRepository;
    }

    /**
     * Lấy sản lượng của employee trong tháng
     */
    @GetMapping("/by-employee-month")
    public ResponseEntity<?> getByEmployeeAndMonth(
            @RequestParam Integer userId,
            @RequestParam String month) {  // yyyy-MM-dd hoặc yyyy-MM
        Map<String, Object> body = new HashMap<>();
        try {
            LocalDate monthDate;
            if (month.length() == 7) {  // yyyy-MM
                monthDate = LocalDate.parse(month + "-01");
            } else {
                monthDate = LocalDate.parse(month);
            }

            List<TbEmployeeProduction> list = employeeProductionRepo
                    .findByEmployeeAndMonth(userId, monthDate);
            TbEmployeeProduction ep = list.isEmpty() ? null : list.get(0);

            body.put("success", true);
            body.put("data", ep);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    /**
     * Lấy sản lượng của tất cả employees trong 1 production (tháng)
     */
    @GetMapping("/by-production/{productionId}")
    public ResponseEntity<?> getByProduction(@PathVariable Integer productionId) {
        Map<String, Object> body = new HashMap<>();
        try {
            List<TbEmployeeProduction> list = employeeProductionRepo.findByProduction(productionId);

            body.put("success", true);
            body.put("data", list);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    /**
     * Lấy sản lượng của các employees trong 1 bộ phận cho 1 tháng
     */
    @GetMapping("/by-department-month")
    public ResponseEntity<?> getByDepartmentAndMonth(
            @RequestParam Integer departmentId,
            @RequestParam String month) {  // yyyy-MM-dd hoặc yyyy-MM
        Map<String, Object> body = new HashMap<>();
        try {
            LocalDate monthDate;
            if (month.length() == 7) {  // yyyy-MM
                monthDate = LocalDate.parse(month + "-01");
            } else {
                monthDate = LocalDate.parse(month);
            }

            List<TbEmployeeProduction> list = employeeProductionRepo
                    .findByDepartmentAndMonth(departmentId, monthDate);

            body.put("success", true);
            body.put("data", list);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    /**
     * Tạo hoặc cập nhật sản lượng employee cho tháng
     */
    @PostMapping
    public ResponseEntity<?> createOrUpdate(@RequestBody TbEmployeeProduction request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getEmployee() == null || request.getEmployee().getId() == null) {
                body.put("success", false);
                body.put("message", "userId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getProduction() == null || request.getProduction().getId() == null) {
                body.put("success", false);
                body.put("message", "productionId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getProductCount() == null || request.getProductCount() < 0) {
                body.put("success", false);
                body.put("message", "productCount must be >= 0");
                return ResponseEntity.badRequest().body(body);
            }

            // Validate employee exists
            TbUser employee = userRepository.findById(request.getEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Validate production exists
            TbProduction production = productionRepo.findById(request.getProduction().getId())
                    .orElseThrow(() -> new RuntimeException("Production not found"));

            // Check if already exists for this month
            List<TbEmployeeProduction> existingList = employeeProductionRepo
                    .findByEmployeeAndMonth(employee.getId(), production.getDop());

            TbEmployeeProduction ep;
            boolean isUpdate = !existingList.isEmpty();
            if (isUpdate) {
                // Update existing (take first if multiple)
                ep = existingList.get(0);
                ep.setProductCount(request.getProductCount());
                ep.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : production.getUnitPrice());
                ep.setUpdatedAt(Instant.now());
            } else {
                // Create new
                ep = new TbEmployeeProduction();
                ep.setEmployee(employee);
                ep.setProduction(production);
                ep.setProductCount(request.getProductCount());
                ep.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : production.getUnitPrice());
                ep.setCreatedAt(Instant.now());
            }

            TbEmployeeProduction saved = employeeProductionRepo.save(ep);

            body.put("success", true);
            body.put("message", isUpdate ? "Updated" : "Created");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    /**
     * Xóa sản lượng employee
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbEmployeeProduction ep = employeeProductionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("EmployeeProduction not found"));

            employeeProductionRepo.delete(ep);

            body.put("success", true);
            body.put("message", "Deleted successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    /**
     * Lấy sản lượng của 1 employee
     */
    @GetMapping("/by-employee/{userId}")
    public ResponseEntity<?> getByEmployee(@PathVariable Integer userId) {
        Map<String, Object> body = new HashMap<>();
        try {
            List<TbEmployeeProduction> list = employeeProductionRepo.findByEmployee(userId);

            body.put("success", true);
            body.put("data", list);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}
