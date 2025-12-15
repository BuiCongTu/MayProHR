package fpt.aptech.springbootapp.api.ModuleC;
import fpt.aptech.springbootapp.entities.Core.TbLine;
import fpt.aptech.springbootapp.entities.ModuleC.TbProduction;
import fpt.aptech.springbootapp.entities.ModuleC.TbProductionLine;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.LineRepository;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionLineRepo;
import fpt.aptech.springbootapp.repositories.ModuleC_Payroll.ProductionRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/production-line")
public class ProductionLineController {
    private final ProductionLineRepo productionLineRepo;
    private final ProductionRepo productionRepo;
    private final LineRepository lineRepository;

    @Autowired
    public ProductionLineController(ProductionLineRepo productionLineRepo,
                                    ProductionRepo productionRepo,
                                    LineRepository lineRepository) {
        this.productionLineRepo = productionLineRepo;
        this.productionRepo = productionRepo;
        this.lineRepository = lineRepository;
    }

    //list
    @GetMapping
    public ResponseEntity<?> getProductionLines(
            @RequestParam(required = false) Integer productionId,
            @RequestParam(required = false) Integer sublineId
    ) {
        Map<String, Object> body = new HashMap<>();
        try {
            List<TbProductionLine> list = productionLineRepo.findAll();
            if (productionId != null) {
                list = list.stream()
                        .filter(pl -> pl.getProduction() != null
                                && pl.getProduction().getId().equals(productionId))
                        .toList();
            }
            if (sublineId != null) {
                list = list.stream()
                        .filter(pl -> pl.getSubline() != null
                                && pl.getSubline().getId().equals(sublineId))
                        .toList();
            }
            list.sort(Comparator.comparing(pl -> pl.getId()));
            body.put("success", true);
            body.put("message", "Get production lines successfully");
            body.put("data", list);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
    //lay 1 production line theo id
    @GetMapping("/{id}")
    public ResponseEntity<?> getProductionLineById(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProductionLine pl = productionLineRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("ProductionLine not found: " + id));

            body.put("success", true);
            body.put("data", pl);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    //create 1 produc
    @PostMapping
    public ResponseEntity<?> createProductionLine(@RequestBody TbProductionLine request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getProduction() == null || request.getProduction().getId() == null) {
                body.put("success", false);
                body.put("message", "productionId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getLine() == null || request.getLine().getId() == null) {
                body.put("success", false);
                body.put("message", "lineId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getSubline() == null || request.getSubline().getId() == null) {
                body.put("success", false);
                body.put("message", "sublineId is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getCountContribution() == null || request.getCountContribution() < 0) {
                body.put("success", false);
                body.put("message", "countContribution must be >= 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getTotalWorkingHours() == null || request.getTotalWorkingHours() <= 0) {
                body.put("success", false);
                body.put("message", "totalWorkingHours must be > 0");
                return ResponseEntity.badRequest().body(body);
            }

            TbProduction production = productionRepo.findById(request.getProduction().getId())
                    .orElseThrow(() -> new RuntimeException("Production not found: " + request.getProduction().getId()));

            TbLine line = lineRepository.findById(request.getLine().getId())
                    .orElseThrow(() -> new RuntimeException("Line not found: " + request.getLine().getId()));

            TbLine subline = lineRepository.findById(request.getSubline().getId())
                    .orElseThrow(() -> new RuntimeException("SubLine not found: " + request.getSubline().getId()));

            TbProductionLine pl = new TbProductionLine();
            pl.setProduction(production);
            pl.setLine(line);
            pl.setSubline(subline);
            pl.setCountContribution(request.getCountContribution());
            pl.setTotalWorkingHours(request.getTotalWorkingHours());
            pl.setProductSalaryPerHour(
                    request.getProductSalaryPerHour() != null ? request.getProductSalaryPerHour() : BigDecimal.ZERO
            );
            pl.setCreatedAt(Instant.now());

            TbProductionLine saved = productionLineRepo.save(pl);

            body.put("success", true);
            body.put("message", "Create production line successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    //edit productline

    @PutMapping("/{id}")
    public ResponseEntity<?> updateProductionLine(@PathVariable Integer id,
                                                  @RequestBody TbProductionLine request) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProductionLine pl = productionLineRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("ProductionLine not found: " + id));

            if (request.getProduction() != null && request.getProduction().getId() != null) {
                TbProduction production = productionRepo.findById(request.getProduction().getId())
                        .orElseThrow(() -> new RuntimeException("Production not found: " + request.getProduction().getId()));
                pl.setProduction(production);
            }

            if (request.getLine() != null && request.getLine().getId() != null) {
                TbLine line = lineRepository.findById(request.getLine().getId())
                        .orElseThrow(() -> new RuntimeException("Line not found: " + request.getLine().getId()));
                pl.setLine(line);
            }

            if (request.getSubline() != null && request.getSubline().getId() != null) {
                TbLine subline = lineRepository.findById(request.getSubline().getId())
                        .orElseThrow(() -> new RuntimeException("SubLine not found: " + request.getSubline().getId()));
                pl.setSubline(subline);
            }

            if (request.getCountContribution() != null) {
                if (request.getCountContribution() < 0) {
                    body.put("success", false);
                    body.put("message", "countContribution must be >= 0");
                    return ResponseEntity.badRequest().body(body);
                }
                pl.setCountContribution(request.getCountContribution());
            }

            if (request.getTotalWorkingHours() != null) {
                if (request.getTotalWorkingHours() <= 0) {
                    body.put("success", false);
                    body.put("message", "totalWorkingHours must be > 0");
                    return ResponseEntity.badRequest().body(body);
                }
                pl.setTotalWorkingHours(request.getTotalWorkingHours());
            }

            if (request.getProductSalaryPerHour() != null) {
                pl.setProductSalaryPerHour(request.getProductSalaryPerHour());
            }

            TbProductionLine saved = productionLineRepo.save(pl);

            body.put("success", true);
            body.put("message", "Update production line successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    //dele product line
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProductionLine(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbProductionLine pl = productionLineRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("ProductionLine not found: " + id));

            productionLineRepo.deleteById(id);
            body.put("success", true);
            body.put("message", "Delete production line successfully");
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }
}
