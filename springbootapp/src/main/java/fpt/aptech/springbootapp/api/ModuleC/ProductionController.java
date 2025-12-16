package fpt.aptech.springbootapp.api.ModuleC;

import fpt.aptech.springbootapp.entities.Core.TbDepartment;
import fpt.aptech.springbootapp.entities.ModuleC.TbProduction;
import fpt.aptech.springbootapp.repositories.DepartmentRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/production")
public class ProductionController {
    private ProductionRepo productionRepo;
    private DepartmentRepository departmentRepository;

    @Autowired
    public ProductionController(ProductionRepo productionRepo,
                                DepartmentRepository departmentRepository) {
        this.productionRepo = productionRepo;
        this.departmentRepository = departmentRepository;
    }

    //list all productions
    @GetMapping
    public ResponseEntity<?> getProductions(
            @RequestParam(required = false) Integer departmentId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate) {

        Map<String, Object> body = new HashMap<>();
        try {
            List<TbProduction> list = productionRepo.findAll();

            if (departmentId != null) {
                list = list.stream()
                        .filter(p -> p.getDepartment() != null
                                && p.getDepartment().getId().equals(departmentId))
                        .toList();
            }

            LocalDate from = null;
            LocalDate to = null;
            if (fromDate != null && !fromDate.isBlank()) {
                from = LocalDate.parse(fromDate);
            }
            if (toDate != null && !toDate.isBlank()) {
                to = LocalDate.parse(toDate);
            }

            if (from != null) {
                LocalDate finalFrom = from;
                list = list.stream()
                        .filter(p -> !p.getDop().isBefore(finalFrom))
                        .toList();
            }
            if (to != null) {
                LocalDate finalTo = to;
                list = list.stream()
                        .filter(p -> !p.getDop().isAfter(finalTo))
                        .toList();
            }

            list.sort(Comparator.comparing(TbProduction::getDop)
                    .thenComparing(p -> p.getDepartment().getId()));

            body.put("success", true);
            body.put("message", "Get productions successfully");
            body.put("data", list);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Lấy 1 production
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductionById(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProduction p = productionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production not found: " + id));

            body.put("success", true);
            body.put("data", p);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Tạo Production
    @PostMapping
    public ResponseEntity<?> createProduction(@RequestBody TbProduction request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getDepartment() == null || request.getDepartment().getId() == null) {
                body.put("success", false);
                body.put("message", "departmentId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getDop() == null) {
                body.put("success", false);
                body.put("message", "dop (date of production) is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getProductCount() == null || request.getProductCount() < 0) {
                body.put("success", false);
                body.put("message", "productCount must be >= 0");
                return ResponseEntity.badRequest().body(body);
            }

            TbDepartment dept = departmentRepository.findById(request.getDepartment().getId())
                    .orElseThrow(() -> new RuntimeException("Department not found: " + request.getDepartment().getId()));

            TbProduction p = new TbProduction();
            p.setDepartment(dept);
            p.setName(request.getName());
            p.setDop(request.getDop());
            p.setProductCount(request.getProductCount());
            p.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : java.math.BigDecimal.ZERO);
            // Save optional hierarchy names if provided
            p.setLineName(request.getLineName());
            p.setSubLineName(request.getSubLineName());
            p.setWorkUnitName(request.getWorkUnitName());
            p.setCreatedAt(Instant.now());

            TbProduction saved = productionRepo.save(p);

            body.put("success", true);
            body.put("message", "Create production successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Cập nhật Production
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduction(@PathVariable Integer id,
                                              @RequestBody TbProduction request) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProduction p = productionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production not found: " + id));

            if (request.getDepartment() != null && request.getDepartment().getId() != null) {
                TbDepartment dept = departmentRepository.findById(request.getDepartment().getId())
                        .orElseThrow(() -> new RuntimeException("Department not found: " + request.getDepartment().getId()));
                p.setDepartment(dept);
            }

            if (request.getName() != null) {
                p.setName(request.getName());
            }

            if (request.getDop() != null) {
                p.setDop(request.getDop());
            }

            if (request.getProductCount() != null) {
                if (request.getProductCount() < 0) {
                    body.put("success", false);
                    body.put("message", "productCount must be >= 0");
                    return ResponseEntity.badRequest().body(body);
                }
                p.setProductCount(request.getProductCount());
            }

            if (request.getUnitPrice() != null) {
                p.setUnitPrice(request.getUnitPrice());
            }

            // Update optional hierarchy names when provided (can be null to clear)
            if (request.getLineName() != null || request.getSubLineName() != null || request.getWorkUnitName() != null) {
                if (request.getLineName() != null) p.setLineName(request.getLineName());
                if (request.getSubLineName() != null) p.setSubLineName(request.getSubLineName());
                if (request.getWorkUnitName() != null) p.setWorkUnitName(request.getWorkUnitName());
            }

            TbProduction saved = productionRepo.save(p);

            body.put("success", true);
            body.put("message", "Update production successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // delete
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProduction(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProduction p = productionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("Production not found: " + id));

            productionRepo.delete(p);

            body.put("success", true);
            body.put("message", "Delete production successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Search productions by department + month (e.g., 2025-11)
    @GetMapping("/search-by-structure")
    public ResponseEntity<?> searchByStructure(
            @RequestParam Integer departmentId,
            @RequestParam(required = false) Integer lineId,
            @RequestParam(required = false) Integer subLineId,
            @RequestParam(required = false) Integer wordUnitId,
            @RequestParam String month) { // YYYY-MM format

        Map<String, Object> body = new HashMap<>();
        try {
            // Parse month YYYY-MM to LocalDate range
            YearMonth ym = YearMonth.parse(month);
            LocalDate startDate = ym.atDay(1);
            LocalDate endDate = ym.atEndOfMonth();

            List<TbProduction> productions = productionRepo.findAll().stream()
                    .filter(p -> p.getDepartment() != null && p.getDepartment().getId().equals(departmentId))
                    .filter(p -> p.getDop() != null && !p.getDop().isBefore(startDate) && !p.getDop().isAfter(endDate))
                    .toList();

            body.put("success", true);
            body.put("message", "Get productions successfully");
            body.put("data", productions);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

}
