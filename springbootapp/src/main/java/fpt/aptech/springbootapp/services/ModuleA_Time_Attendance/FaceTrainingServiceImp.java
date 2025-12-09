package fpt.aptech.springbootapp.services.ModuleA_Time_Attendance;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import fpt.aptech.springbootapp.entities.Core.TbFaceTraining;
import fpt.aptech.springbootapp.entities.Core.TbUser;
import fpt.aptech.springbootapp.repositories.ModuleA_Time_Attendance.FaceTrainingRepository;
import fpt.aptech.springbootapp.repositories.UserRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class FaceTrainingServiceImp implements FaceTrainingService {

    @Value("${face.model.version:v1.0}")
    private String modelVersion;

    @Value("${face.recognition.api.url:http://localhost:5001}")
    private String faceApiUrl;

    private final FaceTrainingRepository faceTrainingRepository;
    private final UserRepository userRepository;
    private WebClient webClient;

    @Autowired
    public FaceTrainingServiceImp(FaceTrainingRepository faceTrainingRepository, UserRepository userRepository) {
        this.faceTrainingRepository = faceTrainingRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void init() {
        this.webClient = WebClient.create(faceApiUrl);
    }

    @Override
    public TbFaceTraining trainFace(Integer userId, String imageBase64, Integer trainedByUserId) {
        try {
            TbUser user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            TbUser trainedByUser = userRepository.findById(trainedByUserId)
                    .orElseThrow(() -> new RuntimeException("Trainer user not found: " + trainedByUserId));
            //goi python service qua webclient
            Map<String, String> request = new HashMap<>();
            request.put("image_base64", imageBase64);
            request.put("user_id", userId.toString());
            request.put("full_name", user.getFullName());

            //call api python
            Map<String, Object> responseData = webClient.post()
                    .uri("/api/face/register")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(java.time.Duration.ofSeconds(30))
                    .onErrorMap(WebClientResponseException.class, ex
                            -> new RuntimeException("Python service error: " + ex.getMessage()))
                    .block();

            if (responseData == null) {
                throw new RuntimeException("Python service returned null response");
            }

            String embeddingPath = (String) responseData.get("embedding_path");
            Double confidence = (Double) responseData.get("confidence");

            Optional<TbFaceTraining> existingTraining = faceTrainingRepository.findByUserId(userId);

            TbFaceTraining faceTraining = existingTraining.orElseGet(TbFaceTraining::new);
            faceTraining.setUser(user);
            faceTraining.setIsTrained(true);
            faceTraining.setTrainingDate(Instant.now());
            faceTraining.setModelVersion(modelVersion);
            faceTraining.setTrainedByUser(trainedByUser);
            faceTraining.setConfidence(new BigDecimal(confidence));
            faceTraining.setFaceImagePath(embeddingPath);
            faceTraining.setUpdatedAt(Instant.now());

            TbFaceTraining saved = faceTrainingRepository.save(faceTraining);
            log.info("Face training saved successfully for userId: {}", userId);

            return saved;

        } catch (Exception e) {
            log.error("Error training face for userId: {}", userId, e);
            throw new RuntimeException("Face training failed: " + e.getMessage());
        }
    }

    @Override
    public Optional<TbFaceTraining> getFaceTrainingByUserId(Integer userId) {
        return faceTrainingRepository.findByUserId(userId);
    }

    @Override
    public boolean isUserFaceTrained(Integer userId) {
        return faceTrainingRepository.existsByUserId(userId);

    }

    @Override
    public List<TbFaceTraining> getAllTrainedFaces() {
        return faceTrainingRepository.findByIsTrainedTrue();
    }

    @Override
    public List<TbFaceTraining> getAllUntrainedUsers() {
        return faceTrainingRepository.findByIsTrainedFalse();
    }

    @Override
    public TbFaceTraining updateFaceTraining(Integer userId, String imageBase64, Integer trainedByUserId) {
        return trainFace(userId, imageBase64, trainedByUserId);
    }

    @Override
    public void deleteFaceTraining(Integer userId) {
        Optional<TbFaceTraining> faceTraining = faceTrainingRepository.findByUserId(userId);
        faceTraining.ifPresent(ft -> {
            faceTrainingRepository.delete(ft);
            log.info("Face training deleted for userId: {}", userId);
        });
    }

    @Override
    public List<TbFaceTraining> getFaceTrainingByModelVersion(String modelVersion) {
        return faceTrainingRepository.findByModelVersion(modelVersion);
    }
}
