package fpt.aptech.springbootapp.api.System;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FaceConfigController {
    @Value("${face.model.version:v1.0}")
    private String modelVersion;

    @Value("${face.confidence.threshold:0.7}")
    private double confidenceThreshold;

    @Value("${face.recognition.min-gap:0.15}")
    private double minGap;

    @GetMapping("/api/face/config")
    public ResponseEntity<Map<String, Object>> getFaceConfig() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "modelVersion", modelVersion,
                "recognitionThreshold", confidenceThreshold,
                "minGap", minGap
        ));
    }

}
