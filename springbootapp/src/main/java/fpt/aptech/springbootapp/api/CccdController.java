package fpt.aptech.springbootapp.api;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import fpt.aptech.springbootapp.dtos.ApplicationFormDto;
import fpt.aptech.springbootapp.dtos.CccdInfoDto;
import fpt.aptech.springbootapp.services.AgentService;

@RestController
@RequestMapping("/api/cccd")
public class CccdController {

    @Autowired
    private AgentService agentService;

    @PostMapping("/scan")
    public ResponseEntity<?> scanCccd(@RequestParam("file") MultipartFile file) {
        System.out.println("Received file: " + file.getOriginalFilename() + " size=" + file.getSize());
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            CccdInfoDto dto = agentService.scanCccd(file);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            e.printStackTrace();
            return ResponseEntity.status(503).body("OCR unavailable: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            String msg = e.getMessage();
            boolean isQuotaIssue = msg != null && (msg.contains("429") || msg.contains("quota") || msg.contains("RESOURCE_EXHAUSTED"));

            if (isQuotaIssue) {
                return ResponseEntity.status(503).body(
                        "Gemini API quota đã hết (free tier limit). Hệ thống đã parse bằng regex - vui lòng kiểm tra kết quả."
                );
            }
            return ResponseEntity.status(500).body("OCR failed: " + e.getMessage());
        }
    }

    @PostMapping("/scan-application")
    public ResponseEntity<?> scanApplicationForm(@RequestParam("file") MultipartFile file) {
        System.out.println("[Application] Received file: " + file.getOriginalFilename() + " size=" + file.getSize());
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            ApplicationFormDto dto = agentService.scanApplicationForm(file);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            e.printStackTrace();
            return ResponseEntity.status(503).body("OCR unavailable: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Scan failed: " + e.getMessage());
        }
    }
}
