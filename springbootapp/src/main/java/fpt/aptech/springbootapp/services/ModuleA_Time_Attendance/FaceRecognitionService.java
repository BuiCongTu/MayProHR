package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FaceRecognitionService {

    @Value("${face.recognition.api.url:http://localhost:5001}")
    private String faceApiUrl;

    private final RestTemplate restTemplate;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public FaceRecognitionService(RestTemplate restTemplate,
                                  UserRepository userRepository,
                                  ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Đăng ký khuôn mặt cho nhân viên
     */
    public Map<String, Object> registerFace(Integer userId, String imageBase64) {
        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

            Map<String, Object> request = new HashMap<>();
            request.put("userId", userId);
            request.put("imageBase64", imageBase64);
            request.put("fullName", user.getFullName());

            String url = faceApiUrl + "/api/face/register";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                Map<String, Object> result = response.getBody();

                if (Boolean.TRUE.equals(result.get("success")) && result.get("embedding") != null) {
                    try {
                        String embeddingJson = objectMapper.writeValueAsString(result.get("embedding"));
                        user.setFaceData(embeddingJson);
                        userRepository.save(user);
                        log.info("Saved face embedding to TbUser.faceData for userId: {}", userId);
                    } catch (Exception ex) {
                        log.warn("Failed to save faceData for user {}: {}", userId, ex.getMessage());
                    }
                }

                log.info("Face registered successfully for user: {}", userId);
                return result;
            }

            throw new RuntimeException("Face registration failed");

        } catch (HttpStatusCodeException e) {
            try {
                String body = e.getResponseBodyAsString();
                Map<String, Object> parsed = objectMapper.readValue(
                        body, new TypeReference<Map<String, Object>>() {}
                );
                if (parsed.get("success") == null) parsed.put("success", false);
                return parsed;
            } catch (Exception ex) {
                log.error("Error parsing error response from face service", ex);
                return Map.of("success", false, "message", "Registration failed: " + e.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error registering face for user: {}", userId, e);
            return Map.of("success", false, "message", "Registration failed: " + e.getMessage());
        }
    }

    /**
     * Nhận diện khuôn mặt (check-in/check-out)
     */
    public Map<String, Object> recognizeFace(String imageBase64, String scanType) {
        try {
            Map<String, Object> request = new HashMap<>();
            request.put("imageBase64", imageBase64);
            request.put("scanType", scanType);

            String url = faceApiUrl + "/api/face/recognize";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getBody() == null) {
                throw new RuntimeException("Face recognition failed");
            }

            Map<String, Object> result = response.getBody();

            if (Boolean.TRUE.equals(result.get("success"))) {
                Integer userId = (Integer) result.get("userId");
                TbUser user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    result.put("fullName", user.getFullName());
                    result.put("department", user.getDepartment() != null ? user.getDepartment().getName() : null);
                }
            }

            return result;

        } catch (HttpStatusCodeException e) {
            try {
                String body = e.getResponseBodyAsString();
                Map<String, Object> parsed = objectMapper.readValue(
                        body, new TypeReference<Map<String, Object>>() {}
                );
                if (parsed.get("success") == null) parsed.put("success", false);
                return parsed;
            } catch (Exception ex) {
                log.error("Error parsing error response from face service", ex);
                return Map.of("success", false, "message", "Recognition failed: " + e.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Error recognizing face", e);
            return Map.of("success", false, "message", "Recognition failed: " + e.getMessage());
        }
    }

    public Map<String, Object> trainModel() {
        try {
            String url = faceApiUrl + "/api/face/train";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>("{}", headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

            if (response.getBody() != null) {
                log.info("Model training completed");
                return response.getBody();
            }
            throw new RuntimeException("Model training failed");

        } catch (Exception e) {
            log.error("Error training model", e);
            return Map.of("success", false, "message", "Training failed: " + e.getMessage());
        }
    }

    public Map<String, Object> deleteFace(Integer userId) {
        try {
            String url = faceApiUrl + "/api/face/delete/" + userId;

            ResponseEntity<Map> response = restTemplate.exchange(
                    url,
                    HttpMethod.DELETE,
                    null,
                    Map.class
            );

            if (response.getBody() != null) {
                log.info("Face data deleted for user: {}", userId);
                return response.getBody();
            }
            throw new RuntimeException("Delete failed");

        } catch (Exception e) {
            log.error("Error deleting face data for user: {}", userId, e);
            return Map.of("success", false, "message", "Delete failed: " + e.getMessage());
        }
    }

    public boolean isServiceAvailable() {
        try {
            String url = faceApiUrl + "/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.warn("Face recognition service is not available");
            return false;
        }
    }
}
