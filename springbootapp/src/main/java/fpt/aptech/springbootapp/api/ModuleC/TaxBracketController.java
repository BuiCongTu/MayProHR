package fpt.aptech.springbootapp.api.ModuleC;
import fpt.aptech.springbootapp.entities.System.TbTaxBracket;
import fpt.aptech.springbootapp.repositories.System.TaxBracketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/tax-bracket")
public class TaxBracketController {
    @Autowired
    private TaxBracketRepository taxBracketRepository;

    //lay ds thue
    @GetMapping
    public ResponseEntity<?> getTaxBrackets(
            @RequestParam(required = false) Boolean active) {

        Map<String, Object> body = new HashMap<>();
        try {
            List<TbTaxBracket> list = taxBracketRepository.findAll();

            if (active != null) {
                list = list.stream()
                        .filter(b -> Boolean.TRUE.equals(b.getIsActive()) == active)
                        .toList();
            }

            list.sort(Comparator.comparing(TbTaxBracket::getBracketNumber));

            body.put("success", true);
            body.put("message", "Get tax brackets successfully");
            body.put("data", list);
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Lấy 1 bracket
    @GetMapping("/{id}")
    public ResponseEntity<?> getTaxBracketById(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxBracket b = taxBracketRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxBracket not found: " + id));

            body.put("success", true);
            body.put("data", b);
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    // Tạo mới
    @PostMapping
    public ResponseEntity<?> createTaxBracket(@RequestBody TbTaxBracket request) {
        Map<String, Object> body = new HashMap<>();
        try {
            if (request.getBracketNumber() == null || request.getBracketNumber() <= 0) {
                body.put("success", false);
                body.put("message", "bracketNumber must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (!isPositive(request.getFromIncome()) || !isPositive(request.getToIncome())) {
                body.put("success", false);
                body.put("message", "fromIncome and toIncome must be > 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (!isPositive(request.getTaxRate())) {
                body.put("success", false);
                body.put("message", "taxRate must be > 0");
                return ResponseEntity.badRequest().body(body);
            }

            TbTaxBracket b = new TbTaxBracket();
            b.setBracketNumber(request.getBracketNumber());
            b.setFromIncome(request.getFromIncome());
            b.setToIncome(request.getToIncome());
            b.setTaxRate(request.getTaxRate());
            b.setDescription(request.getDescription());
            b.setIsActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE);
            b.setCreatedAt(Instant.now());

            TbTaxBracket saved = taxBracketRepository.save(b);

            body.put("success", true);
            body.put("message", "Create tax bracket successfully");
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
    public ResponseEntity<?> updateTaxBracket(@PathVariable Integer id,
                                              @RequestBody TbTaxBracket request) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxBracket b = taxBracketRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxBracket not found: " + id));

            if (request.getBracketNumber() == null || request.getBracketNumber() <= 0) {
                body.put("success", false);
                body.put("message", "bracketNumber must be greater than 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (!isPositive(request.getFromIncome()) || !isPositive(request.getToIncome())) {
                body.put("success", false);
                body.put("message", "fromIncome and toIncome must be > 0");
                return ResponseEntity.badRequest().body(body);
            }
            if (!isPositive(request.getTaxRate())) {
                body.put("success", false);
                body.put("message", "taxRate must be > 0");
                return ResponseEntity.badRequest().body(body);
            }

            b.setBracketNumber(request.getBracketNumber());
            b.setFromIncome(request.getFromIncome());
            b.setToIncome(request.getToIncome());
            b.setTaxRate(request.getTaxRate());
            b.setDescription(request.getDescription());
            if (request.getIsActive() != null) {
                b.setIsActive(request.getIsActive());
            }

            TbTaxBracket saved = taxBracketRepository.save(b);

            body.put("success", true);
            body.put("message", "Update tax bracket successfully");
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
    public ResponseEntity<?> deleteTaxBracket(@PathVariable Integer id) {
        Map<String, Object> body = new HashMap<>();
        try {
            TbTaxBracket b = taxBracketRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("TaxBracket not found: " + id));

            taxBracketRepository.delete(b);

            body.put("success", true);
            body.put("message", "Delete tax bracket successfully");
            return ResponseEntity.ok(body);

        } catch (Exception e) {
            body.put("success", false);
            body.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(body);
        }
    }

    private boolean isPositive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

}
