package fpt.aptech.springbootapp.services;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.gax.core.FixedCredentialsProvider;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.vision.v1.AnnotateImageRequest;
import com.google.cloud.vision.v1.BatchAnnotateImagesResponse;
import com.google.cloud.vision.v1.Feature;
import com.google.cloud.vision.v1.Image;
import com.google.cloud.vision.v1.ImageAnnotatorClient;
import com.google.cloud.vision.v1.ImageAnnotatorSettings;
import com.google.protobuf.ByteString;

import fpt.aptech.springbootapp.dtos.ApplicationFormDto;
import fpt.aptech.springbootapp.dtos.CccdInfoDto;
import io.grpc.StatusRuntimeException;

@Service
public class AgentService {

    @Value("${google.gemini.api-key}")
    private String geminiApiKey;

    @Value("classpath:maypayhr-main-66ad5418f713.json")
    private Resource googleCredentialsResource;

    @Value("${ocr.vision.enabled:true}")
    private boolean visionEnabled;

    private final OcrService ocrService;

    public AgentService(OcrService ocrService) {
        this.ocrService = ocrService;
    }

    // Use gemini-2.5-flash (has quota, 2.0 exhausted)
    private static final String GEMINI_URL
            = "https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent";

    public CccdInfoDto scanCccd(MultipartFile file) throws Exception {

        String ocrText;

        if (visionEnabled) {
            try {
                ocrText = extractTextFromImage(file); // Vision OCR
            } catch (StatusRuntimeException e) {
                if (isBillingPermissionDenied(e)) {
                    System.out.println("[CCCD][OCR] Vision billing PERMISSION_DENIED -> considering Tesseract fallback");
                    ocrText = fallbackToTesseractOrFail(file, "Vision billing/permission denied");
                } else {
                    throw e;
                }
            } catch (RuntimeException e) {
                if (isBillingPermissionDenied(e)) {
                    System.out.println("[CCCD][OCR] Vision billing error (wrapped) -> considering Tesseract fallback");
                    ocrText = fallbackToTesseractOrFail(file, "Vision billing error");
                } else {
                    throw e;
                }
            }
        } else {
            System.out.println("[CCCD][OCR] Vision disabled -> considering Tesseract fallback");
            ocrText = fallbackToTesseractOrFail(file, "Vision disabled (ocr.vision.enabled=false)");
        }

        Map<String, Object> data;
        try {
            System.out.println("[CCCD] Calling Gemini API for parsing...");
            data = parseCccdWithGemini(ocrText);
            System.out.println("[CCCD] Gemini API success!");
        } catch (Exception geminiError) {
            String msg = geminiError.getMessage();
            System.err.println("[CCCD] Gemini API error: " + msg);
            geminiError.printStackTrace();

            boolean isQuotaOrRateLimit = msg != null
                    && (msg.contains("429") || msg.contains("quota")
                    || msg.contains("RESOURCE_EXHAUSTED") || msg.contains("Too Many Requests"));

            if (isQuotaOrRateLimit) {
                System.out.println("[CCCD] Gemini quota/rate limit hit, falling back to regex parser");
                data = parseCccdWithRegex(ocrText);
            } else {
                System.err.println("[CCCD] Gemini non-quota error, rethrowing");
                throw geminiError;
            }
        }
        return mapToDto(data);
    }

    private String fallbackToTesseractOrFail(MultipartFile file, String reason) {
        if (!ocrService.isTesseractEnabled()) {
            throw new IllegalStateException(
                    "No OCR engine available: " + reason + " and Tesseract is disabled (ocr.tesseract.enabled=false)"
            );
        }
        return ocrService.extractText(file);
    }

    private boolean isBillingPermissionDenied(Throwable e) {
        if (e == null) {
            return false;
        }

        if (e instanceof StatusRuntimeException sre && sre.getStatus() != null) {
            if ("PERMISSION_DENIED".equals(sre.getStatus().getCode().name())) {
                return true;
            }
        }

        String msg = e.getMessage();
        if (msg != null) {
            String m = msg.toLowerCase();
            if (m.contains("requires billing") || m.contains("billing to be enabled")) {
                return true;
            }
            if (m.contains("permission_denied") && m.contains("billing")) {
                return true;
            }
        }

        return isBillingPermissionDenied(e.getCause());
    }

    private String extractTextFromImage(MultipartFile file) throws Exception {

        GoogleCredentials credentials = GoogleCredentials
                .fromStream(googleCredentialsResource.getInputStream())
                .createScoped(List.of("https://www.googleapis.com/auth/cloud-platform"));

        ImageAnnotatorSettings settings = ImageAnnotatorSettings.newBuilder()
                .setCredentialsProvider(FixedCredentialsProvider.create(credentials))
                .build();

        ByteString imgBytes = ByteString.copyFrom(file.getBytes());

        Image image = Image.newBuilder()
                .setContent(imgBytes)
                .build();

        Feature feature = Feature.newBuilder()
                .setType(Feature.Type.TEXT_DETECTION)
                .build();

        AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                .setImage(image)
                .addFeatures(feature)
                .build();

        try (ImageAnnotatorClient client = ImageAnnotatorClient.create(settings)) {
            BatchAnnotateImagesResponse response
                    = client.batchAnnotateImages(List.of(request));

            if (response.getResponses(0).hasError()) {
                throw new RuntimeException("OCR error: " + response.getResponses(0).getError().getMessage());
            }

            return response.getResponses(0)
                    .getFullTextAnnotation()
                    .getText();
        }
    }

    private Map<String, Object> parseCccdWithGemini(String ocrText) throws Exception {

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-goog-api-key", geminiApiKey);

        String prompt = """
                Đây là text OCR từ CCCD Việt Nam:

                %s

                Trả về JSON thuần:
                {
                  "fullName": "",
                  "cccdNumber": "",
                  "dob": "",
                  "gender": "",
                  "address": ""
                }
                """.formatted(ocrText);

        Map<String, Object> body = Map.of(
                "contents", List.of(
                        Map.of(
                                "parts", List.of(
                                        Map.of("text", prompt)
                                )
                        )
                )
        );

        HttpEntity<Map<String, Object>> entity
                = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response
                = restTemplate.postForEntity(GEMINI_URL, entity, Map.class);

        Map<String, Object> bodyMap = response.getBody();

        List<Map<String, Object>> candidates
                = (List<Map<String, Object>>) bodyMap.get("candidates");

        Map<String, Object> content
                = (Map<String, Object>) candidates.get(0).get("content");

        List<Map<String, Object>> parts
                = (List<Map<String, Object>>) content.get("parts");

        String text = (String) parts.get(0).get("text");

        text = text.replace("```json", "")
                .replace("```", "")
                .trim();

        return new ObjectMapper().readValue(text, Map.class);
    }

    private Map<String, Object> parseCccdWithRegex(String ocrText) {
        Map<String, Object> result = new java.util.HashMap<>();

        System.out.println("[CCCD Regex] OCR Text length: " + ocrText.length());
        System.out.println("[CCCD Regex] First 200 chars: " + ocrText.substring(0, Math.min(200, ocrText.length())));

        // CCCD number: 12 digits
        java.util.regex.Pattern cccdPattern = java.util.regex.Pattern.compile("\\b\\d{12}\\b");
        java.util.regex.Matcher cccdMatcher = cccdPattern.matcher(ocrText);
        if (cccdMatcher.find()) {
            result.put("cccdNumber", cccdMatcher.group());
        } else {
            result.put("cccdNumber", "");
        }

        // DOB: dd/mm/yyyy or dd-mm-yyyy
        java.util.regex.Pattern dobPattern = java.util.regex.Pattern.compile("\\b\\d{2}[/-]\\d{2}[/-]\\d{4}\\b");
        java.util.regex.Matcher dobMatcher = dobPattern.matcher(ocrText);
        if (dobMatcher.find()) {
            result.put("dob", dobMatcher.group().replace("-", "/"));
        } else {
            result.put("dob", "");
        }

        // Gender - look for both Vietnamese and English
        String gender = extractGender(ocrText);
        result.put("gender", gender);

        // Name - improved extraction
        String fullName = extractFullName(ocrText);
        result.put("fullName", fullName);

        // Address
        String address = extractAddress(ocrText);
        result.put("address", address);

        System.out.println("[CCCD Regex] Extracted - Name: " + fullName + ", Gender: " + gender + ", DOB: " + result.get("dob"));
        return result;
    }

    private String extractGender(String text) {
        String lower = text.toLowerCase();

        // Look for "Giới tính: Nam/Nữ" or "Sex: Male/Female"
        if (lower.matches(".*gi[oơ]i\\s*t[ií]nh[:\\s]*n[aă]m.*")
                || lower.matches(".*sex[:\\s]*male.*")) {
            return "Nam";
        }
        if (lower.matches(".*gi[oơ]i\\s*t[ií]nh[:\\s]*n[ữu].*")
                || lower.matches(".*sex[:\\s]*female.*")) {
            return "Nữ";
        }

        // Fallback: simple contains
        if (lower.contains("nam") && !lower.contains("nữ") && !lower.contains("việt nam")) {
            return "Nam";
        }
        if (lower.contains("nữ")) {
            return "Nữ";
        }

        return "";
    }

    private String extractFullName(String text) {
        // Common address keywords to avoid (blacklist)
        String[] addressBlacklist = {
            "TAM QUAN", "HOÀI NHƠN", "BÌNH ĐỊNH",
            "QUẬN", "PHƯỜNG", "XÃ", "THị TRẤN",
            "THÀNH PHỐ", "TP", "HÀ NỘI", "HỒ CHÍ MINH",
            "ĐÀ NẶNG", "CẦN THƠ", "HẢI PHÒNG",
            "PHUỴ", "THÁI BÌNH", "NAM ĐỊNH",
            "LONG AN", "ĐỒNG NAI", "BÌNH DƯƠNG",
            // CCCD document title keywords
            "CĂN CƯỚC", "CAN CƯỚC", "CÔNG DÂN", "CONG DAN", "GÔNG DÁN",
            "IDENTITY", "CARD", "CMND", "CHỨNG MINH",
            // Application form keywords (ban giám đốc, công ty, ...)
            "BAN GIÁM", "BAN GIDM", "GIÁM ĐỐC", "GIAM DOC",
            "CÔNG TY", "CONG TY", "CTNG TY", "CING TY",
            "QUẢN LÝ", "QUAN LY", "MBIN SV", "MÔI SV",
            "KÍNH GỬI", "KINH GUI", "GIAN AANG", "GIAO HÀNG",
            "TRƯờNG PHÒNG", "TRUONG PHONG"
        };

        String[] lines = text.split("\\n");

        // Strategy 1: Look for name after keywords (including OCR errors)
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i].trim();
            String lower = line.toLowerCase();

            // OCR common errors: "Hy và tên" (= "Họ và tên"), "tows", "tôi tên là:", "CMND số:"
            if (lower.matches(".*(h[yoọ]\\s*v[aà]\\s*t[eê]n|tôi\\s*t[eê]n\\s*l[aà]|tows|t[eê]u\\s*l[aà]|t[eê]n[:\\s]|full\\s*name|name[:\\s]).*")
                    || lower.matches(".*(cmnd|cccd)\\s*s[oốô][:\\s]*.*")) {

                // Try to extract name from same line (after keyword)
                String candidate = extractNameFromLine(line);
                if (!candidate.isEmpty() && !isAddressKeyword(candidate, addressBlacklist)) {
                    System.out.println("[Name] Found after label in same line: " + candidate);
                    return candidate;
                }

                // Try next line
                if (i + 1 < lines.length) {
                    String nextLine = lines[i + 1].trim();
                    String cleanedNextLine = normalizeOcrName(nextLine);

                    if (!cleanedNextLine.isEmpty() && isVietnameseName(cleanedNextLine)
                            && !isAddressKeyword(cleanedNextLine, addressBlacklist)) {
                        System.out.println("[Name] Found in next line after label (normalized): " + cleanedNextLine);
                        return cleanedNextLine.toUpperCase();
                    }
                }

                // Try line +2 (for multi-line names)
                if (i + 2 < lines.length) {
                    String nextLine2 = lines[i + 2].trim();
                    String cleanedNextLine2 = normalizeOcrName(nextLine2);

                    if (!cleanedNextLine2.isEmpty() && isVietnameseName(cleanedNextLine2)
                            && !isAddressKeyword(cleanedNextLine2, addressBlacklist)) {
                        System.out.println("[Name] Found in line +2 after label (normalized): " + cleanedNextLine2);
                        return cleanedNextLine2.toUpperCase();
                    }
                }
            }
        }

        // Strategy 2: Look for Vietnamese names (ALL CAPS or Title Case), excluding addresses
        // Pattern 1: ALL CAPS (CCCD format: "NGUYÊN MINH QUẦN")
        java.util.regex.Pattern allCapsPattern = java.util.regex.Pattern.compile(
                "\\b[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{2,}(?:\\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]{2,}){1,3}\\b"
        );
        java.util.regex.Matcher allCapsMatcher = allCapsPattern.matcher(text);

        while (allCapsMatcher.find()) {
            String candidate = allCapsMatcher.group().toUpperCase();

            // Skip if in blacklist
            if (isAddressKeyword(candidate, addressBlacklist)) {
                System.out.println("[Name] Skipped blacklisted: " + candidate);
                continue;
            }

            // Validate: Must have at least 1 word with >= 3 chars (filter "LY SE", "AN HA"...)
            String[] words = candidate.split("\\s+");
            boolean hasLongWord = false;
            for (String word : words) {
                if (word.length() >= 3) {
                    hasLongWord = true;
                    break;
                }
            }

            if (!hasLongWord) {
                System.out.println("[Name] Skipped short ALL CAPS name (all words < 3 chars): " + candidate);
                continue;
            }

            System.out.println("[Name] Found ALL CAPS name (validated): " + candidate);
            return candidate;
        }

        // Pattern 2: Title Case (Application form: "Nguyen Minh Quan")
        java.util.regex.Pattern titleCasePattern = java.util.regex.Pattern.compile(
                "\\b[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+){1,3}\\b"
        );
        java.util.regex.Matcher titleCaseMatcher = titleCasePattern.matcher(text);

        while (titleCaseMatcher.find()) {
            String candidate = titleCaseMatcher.group().toUpperCase();

            // Skip if in blacklist
            if (isAddressKeyword(candidate, addressBlacklist)) {
                System.out.println("[Name] Skipped blacklisted: " + candidate);
                continue;
            }

            // Validate: Must have at least 1 word with >= 3 chars
            String[] words = candidate.split("\\s+");
            boolean hasLongWord = false;
            for (String word : words) {
                if (word.length() >= 3) {
                    hasLongWord = true;
                    break;
                }
            }

            if (!hasLongWord) {
                System.out.println("[Name] Skipped short Title Case name (all words < 3 chars): " + candidate);
                continue;
            }

            System.out.println("[Name] Found Title Case name (validated): " + candidate);
            return candidate;
        }

        return "";
    }

    // Normalize OCR name with typos: "Ngmyeễm Wim IĐức" -> "Nguyen Van Duc"
    private String normalizeOcrName(String text) {
        if (text == null || text.isEmpty()) {
            return "";
        }

        // Remove dots, commas, hyphens at start/end
        String cleaned = text.replaceAll("^[.\\-,:\\s]+|[.\\-,:\\s]+$", "");

        // Remove multiple dots/special chars: "..." -> " "
        cleaned = cleaned.replaceAll("[.]{2,}", " ");

        // Split and validate each word
        String[] words = cleaned.split("[\\s.\\-,]+");
        java.util.List<String> validWords = new java.util.ArrayList<>();

        // Blacklist words to remove
        String[] stopWords = {"TÔI", "TOI", "CHÚN", "CHUN", "LÀ", "LA", "MÔI", "MOI"};

        for (String word : words) {
            // Skip very short words (OCR noise)
            if (word.length() < 2) {
                continue;
            }

            // Skip blacklisted stop words
            String upperWord = word.toUpperCase();
            boolean isStopWord = false;
            for (String stop : stopWords) {
                if (upperWord.equals(stop)) {
                    isStopWord = true;
                    break;
                }
            }
            if (isStopWord) {
                System.out.println("[Normalize] Removed stop word: " + word);
                continue;
            }

            // Skip words with too many special chars or numbers
            if (word.matches(".*[0-9]{2,}.*")) {
                continue;
            }
            if (word.replaceAll("[a-zA-ZÀ-ỹ]", "").length() > word.length() / 2) {
                continue;
            }

            validWords.add(word);
        }

        // Must have 2-5 words to be a valid name
        if (validWords.size() < 2 || validWords.size() > 5) {
            return "";
        }

        return String.join(" ", validWords);
    }

    private String extractNameFromLine(String line) {
        // Remove common OCR error keywords and extract what's after
        String cleaned = line.replaceAll("(?i)(tôi\\s*t[eê]n\\s*l[aà][:\\s]*|t[eê]u\\s*l[aà][:\\s]*|tows|t[eê]n[:\\s]*|h[oọ]\\s*v[aà]\\s*t[eê]n[:\\s]*|full\\s*name[:\\s]*|name[:\\s]*|cmnd\\s*s[oốô][:\\s]*|cccd\\s*s[oốô][:\\s]*)", "").trim();

        // Normalize OCR errors
        String normalized = normalizeOcrName(cleaned);
        if (!normalized.isEmpty()) {
            cleaned = normalized;
        }

        // Check if remaining text looks like a name
        if (isVietnameseName(cleaned)) {
            return cleaned.toUpperCase();
        }

        return "";
    }

    private boolean isAddressKeyword(String text, String[] blacklist) {
        String upper = text.toUpperCase();
        for (String keyword : blacklist) {
            if (upper.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    private String extractAddress(String text) {
        String[] lines = text.split("\\n");

        for (int i = 0; i < lines.length; i++) {
            String lower = lines[i].toLowerCase();

            if (lower.matches(".*(n[oơ]i\\s*th[ươ]+ng\\s*tr[uú]|address|resident).*")) {
                if (i + 1 < lines.length) {
                    return lines[i + 1].trim();
                }
            }
        }

        return "";
    }

    private boolean isVietnameseName(String text) {
        if (text == null || text.length() < 3) {
            return false;
        }

        // Remove leading/trailing spaces and normalize
        text = text.trim();

        // Must have 2-4 words
        String[] words = text.split("\\s+");
        if (words.length < 2 || words.length > 5) {  // Allow up to 5 words for compound names
            return false;
        }

        // Each word should start with uppercase (or be all uppercase)
        for (String word : words) {
            if (word.isEmpty()) {
                continue;
            }

            // Check if word is either:
            // 1. All uppercase (NGUYỄN)
            // 2. Starts with uppercase (Nguyễn)
            boolean isAllCaps = word.equals(word.toUpperCase());
            boolean startsWithCaps = Character.isUpperCase(word.charAt(0));

            if (!isAllCaps && !startsWithCaps) {
                return false;
            }
        }

        return true;
    }

    private CccdInfoDto mapToDto(Map<String, Object> data) {

        CccdInfoDto dto = new CccdInfoDto();

        dto.setFullName((String) data.get("fullName"));
        dto.setCccdNumber((String) data.get("cccdNumber"));
        dto.setDob((String) data.get("dob"));
        dto.setGender((String) data.get("gender"));
        dto.setAddress((String) data.get("address"));

        return dto;
    }

    // Scan application form (đơn xin việc) - only extract Name and Gender
    public ApplicationFormDto scanApplicationForm(MultipartFile file) throws Exception {
        String ocrText;

        if (visionEnabled) {
            try {
                ocrText = extractTextFromImage(file);
            } catch (Exception e) {
                System.out.println("[Application] Vision OCR failed, using Tesseract");
                ocrText = ocrService.extractText(file);
            }
        } else {
            ocrText = ocrService.extractText(file);
        }

        return parseApplicationFormSimple(ocrText);
    }

    private ApplicationFormDto parseApplicationFormSimple(String ocrText) {
        ApplicationFormDto dto = new ApplicationFormDto();

        System.out.println("[Application] OCR Text length: " + ocrText.length());
        System.out.println("[Application] First 300 chars: " + ocrText.substring(0, Math.min(300, ocrText.length())));

        // Extract full name
        String fullName = extractFullName(ocrText);
        dto.setFullName(fullName.isEmpty() ? "Không tìm thấy" : fullName);

        // Extract gender
        String gender = extractGender(ocrText);
        dto.setGender(gender.isEmpty() ? "Không xác định" : gender);

        // Optional: extract phone and email if available
        dto.setPhone(extractPhone(ocrText));
        dto.setEmail(extractEmail(ocrText));

        System.out.println("[Application] Extracted - Name: " + dto.getFullName() + ", Gender: " + dto.getGender());
        return dto;
    }

    private String extractPhone(String text) {
        // Vietnamese phone: 10 digits starting with 0
        java.util.regex.Pattern phonePattern = java.util.regex.Pattern.compile("\\b0\\d{9}\\b");
        java.util.regex.Matcher phoneMatcher = phonePattern.matcher(text);
        if (phoneMatcher.find()) {
            return phoneMatcher.group();
        }
        return "";
    }

    private String extractEmail(String text) {
        java.util.regex.Pattern emailPattern = java.util.regex.Pattern.compile(
                "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b"
        );
        java.util.regex.Matcher emailMatcher = emailPattern.matcher(text);
        if (emailMatcher.find()) {
            return emailMatcher.group();
        }
        return "";
    }
}
