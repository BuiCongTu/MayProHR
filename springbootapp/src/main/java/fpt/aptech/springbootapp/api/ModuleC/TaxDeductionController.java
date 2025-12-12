package fpt.aptech.springbootapp.api.ModuleC;
import fpt.aptech.springbootapp.entities.System.TbTaxDeduction;
import fpt.aptech.springbootapp.repositories.System.TaxDeductionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/tax-deduction")
public class TaxDeductionController {

    private TaxDeductionRepository taxDeductionRepo;

    @Autowired
    public TaxDeductionController(TaxDeductionRepository taxDeductionRepo) {
        this.taxDeductionRepo = taxDeductionRepo;
    }

    //lay ds deduction
    @GetMapping
    public ResponseEntity<?> getTaxDeductions(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String type
    ) {
        Map<String, Object> body = new HashMap<>();
        try {
            List<TbTaxDeduction> list = taxDeductionRepo.findAll();

            if (type != null && !type.isBlank()) {
                String t = type.trim();
                list = list.stream()
                        .filter(d -> t.equalsIgnoreCase(d.getDeductionType()))
                        .toList();
            }

            if (active != null) {
                list = list.stream()
                        .filter(d -> Boolean.TRUE.equals(d.getIsActive()) == active)
                        .toList();
            }

            list.sort(Comparator.comparing(TbTaxDeduction::getDeductionType)
                    .thenComparing(TbTaxDeduction::getApplicableFrom,
                            Comparator.nullsFirst(Comparator.naturalOrder())));

            body.put("success", true);
            body.put("message", "Get tax deductions successfully");
            body.put("data", list);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // 2. lay deduction theo id
    @GetMapping("/{id}")
    public ResponseEntity<?> getTaxDeductionById(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxDeduction td = taxDeductionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxDeduction not found: " + id));

            body.put("success", true);
            body.put("data", td);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Tạo mới
    @PostMapping
    public ResponseEntity<?> createTaxDeduction(@RequestBody TbTaxDeduction request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getDeductionType() == null || request.getDeductionType().isBlank()) {
                body.put("success", false);
                body.put("message", "deductionType is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getDeductionAmount() == null || request.getDeductionAmount().signum() <= 0) {
                body.put("success", false);
                body.put("message", "deductionAmount must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }

            TbTaxDeduction td = new TbTaxDeduction();
            td.setDeductionType(request.getDeductionType().trim().toUpperCase());
            td.setDeductionAmount(request.getDeductionAmount());
            td.setDescription(request.getDescription());
            td.setIsActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE);
            td.setApplicableFrom(request.getApplicableFrom());
            td.setApplicableTo(request.getApplicableTo());
            td.setCreatedAt(Instant.now());

            TbTaxDeduction saved = taxDeductionRepo.save(td);

            body.put("success", true);
            body.put("message", "Create tax deduction successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Cập nhật
    @PutMapping("/{id}")
    public ResponseEntity<?> updateTaxDeduction(@PathVariable Integer id,
                                                @RequestBody TbTaxDeduction request) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxDeduction td = taxDeductionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxDeduction not found: " + id));

            if (request.getDeductionType() == null || request.getDeductionType().isBlank()) {
                body.put("success", false);
                body.put("message", "deductionType is required");
                return ResponseEntity.badRequest().body(body);
            }
            if (request.getDeductionAmount() == null || request.getDeductionAmount().signum() <= 0) {
                body.put("success", false);
                body.put("message", "deductionAmount must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }

            td.setDeductionType(request.getDeductionType().trim().toUpperCase());
            td.setDeductionAmount(request.getDeductionAmount());
            td.setDescription(request.getDescription());
            if (request.getIsActive() != null) {
                td.setIsActive(request.getIsActive());
            }
            td.setApplicableFrom(request.getApplicableFrom());
            td.setApplicableTo(request.getApplicableTo());

            TbTaxDeduction saved = taxDeductionRepo.save(td);

            body.put("success", true);
            body.put("message", "Update tax deduction successfully");
            body.put("data", saved);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Xóa
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTaxDeduction(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxDeduction td = taxDeductionRepo.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxDeduction not found: " + id));

            taxDeductionRepo.delete(td);

            body.put("success", true);
            body.put("message", "Delete tax deduction successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }


}
