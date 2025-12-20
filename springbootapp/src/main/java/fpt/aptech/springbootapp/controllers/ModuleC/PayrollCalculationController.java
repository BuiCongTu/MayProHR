package fpt.aptech.springbootapp.controllers.ModuleC;

// import java.time.YearMonth;
// import java.util.HashMap;
// import java.util.List;
// import java.util.Map;
// import org.springframework.beans.factory.annotation.Autowired;
// import org.springframework.http.HttpStatus;
// import org.springframework.http.ResponseEntity;
// import org.springframework.web.bind.annotation.GetMapping;
// import org.springframework.web.bind.annotation.PathVariable;
// import org.springframework.web.bind.annotation.PostMapping;
// import org.springframework.web.bind.annotation.RequestMapping;
// import org.springframework.web.bind.annotation.RequestParam;
// import org.springframework.web.bind.annotation.RestController;
// import fpt.aptech.springbootapp.dtos.ModuleC.PayrollCalculationDTO;
// import fpt.aptech.springbootapp.entities.Payroll;
// import fpt.aptech.springbootapp.services.PayrollCalculationService;
// @RestController
// @RequestMapping("/api/v1/payroll")
public class PayrollCalculationController {

    // @Autowired
    // private PayrollCalculationService payrollCalculationService;
    // /**
    //  * Tính lương cho nhân viên POST /api/v1/payroll/calculate
    //  *
    //  * @param userId ID nhân viên
    //  * @param yearMonth Tháng cần tính (format: YYYY-MM)
    //  */
    // @PostMapping("/calculate")
    // public ResponseEntity<?> calculatePayroll(
    //         @RequestParam Integer userId,
    //         @RequestParam String yearMonth) {
    //     try {
    //         YearMonth ym = YearMonth.parse(yearMonth);
    //         PayrollCalculationDTO result = payrollCalculationService.calculatePayrollForTimeBased(userId, ym);
    //         // Lưu kết quả
    //         Payroll payroll = payrollCalculationService.savePayrollResult(result, ym);
    //         Map<String, Object> response = new HashMap<>();
    //         response.put("success", true);
    //         response.put("message", "Tính lương thành công");
    //         response.put("data", result);
    //         response.put("payrollId", payroll.getId());
    //         return ResponseEntity.ok(response);
    //     } catch (Exception e) {
    //         Map<String, Object> errorResponse = new HashMap<>();
    //         errorResponse.put("success", false);
    //         errorResponse.put("message", "Lỗi: " + e.getMessage());
    //         errorResponse.put("error", e.getClass().getSimpleName());
    //         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    //     }
    // }
    // /**
    //  * Lấy kết quả tính lương GET /api/v1/payroll/{userId}/history
    //  */
    // @GetMapping("/{userId}/history")
    // public ResponseEntity<?> getPayrollHistory(@PathVariable Integer userId) {
    //     try {
    //         List<Payroll> payrolls = payrollCalculationService.getPayrollHistory(userId);
    //         Map<String, Object> response = new HashMap<>();
    //         response.put("success", true);
    //         response.put("data", payrolls);
    //         response.put("total", payrolls.size());
    //         return ResponseEntity.ok(response);
    //     } catch (Exception e) {
    //         Map<String, Object> errorResponse = new HashMap<>();
    //         errorResponse.put("success", false);
    //         errorResponse.put("message", e.getMessage());
    //         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    //     }
    // }
    // /**
    //  * Preview tính lương (không lưu) GET /api/v1/payroll/preview
    //  */
    // @GetMapping("/preview")
    // public ResponseEntity<?> previewPayroll(
    //         @RequestParam Integer userId,
    //         @RequestParam String yearMonth) {
    //     try {
    //         YearMonth ym = YearMonth.parse(yearMonth);
    //         PayrollCalculationDTO result = payrollCalculationService.calculatePayrollForTimeBased(userId, ym);
    //         Map<String, Object> response = new HashMap<>();
    //         response.put("success", true);
    //         response.put("data", result);
    //         return ResponseEntity.ok(response);
    //     } catch (Exception e) {
    //         Map<String, Object> errorResponse = new HashMap<>();
    //         errorResponse.put("success", false);
    //         errorResponse.put("message", e.getMessage());
    //         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    //     }
    // }
}
