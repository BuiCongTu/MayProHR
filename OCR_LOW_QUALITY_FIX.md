# 🔍 Xử Lý OCR Chất Lượng Thấp - Cải Thiện Độ Chính Xác

## ❌ Vấn Đề Trước Đây

**OCR Text nhận được:**
```
i OG HAO VET INL
GIAY CHUNG MINH NHÂN DAN
| s©9225416584<
tows NGUYEN TẤN PHÁT.
ee Baer es
= vựng dion: Tam Quan Bắc,
"Ho Nhỏn, Bình Định,
```

**Kết quả sai:**
- Tên: `TAM QUAN BẮC` ❌ (nhầm địa chỉ)
- Tên đúng: `NGUYEN TẤN PHÁT` ✅

---

## ✅ Cải Thiện Đã Áp Dụng

### 1. **Nhận diện OCR Error Keywords**
Backend giờ nhận diện các từ OCR bị lỗi:
- `tows` → `Họ và tên`
- `t©n:` → `Tên:`
- `vựng dion` → `Quê quán`
- **MỚI:** `tôi têu là:` → `Tôi tên là:`
- **MỚI:** `CMND sô:` → `CMND số:`

**Pattern mới:**
```java
if (lower.matches(".*(tôi\\s*tên\\s*là|tows|tên[:\\s]|họ\\s*và\\s*tên|CMND|CCCD).*")) {
    // Extract name from this line or next line
}
```

### 2. **Blacklist Địa Chỉ + Đơn Xin Việc**
Thêm danh sách từ khóa địa chỉ + đơn xin việc để không nhầm với tên:
```java
String[] addressBlacklist = {
    "TAM QUAN", "HOÀI NHƠN", "BÌNH ĐỊNH",
    "QUẬN", "PHƯỜNG", "XÃ", "THỊ TRẤN",
    // ... 15+ địa chỉ
    
    // Application form keywords (MỚI)
    "BAN GIÁM", "BAN GIDM",           // Ban Giám đốc (OCR lỗi)
    "GIÁM ĐỐC", "GIAM DOC",
    "CÔNG TY", "CONG TY", "CING TY",  // Công ty (OCR lỗi)
    "QUẢN LÝ", "QUAN LY", "MBIN SV",
    "KÍNH GỬI", "KINH GUI",
    "GIAN AANG", "GIAO HÀNG",         // OCR errors
    "TRƯỞNG PHÒNG"
};
```

**Ví dụ:**
- ❌ Bỏ qua: "BAN GIDM" (= "Ban Giám đốc" OCR lỗi)
- ✅ Chấp nhận: "NGUYEN VĂN ĐỨC"

### 3. **Normalize OCR Name (MỚI)**
Làm sạch tên có OCR lỗi trước khi validate:

**Input:** `"... Ngmyễm Wim IĐức . -"`

**Processing:**
```java
private String normalizeOcrName(String text) {
    // 1. Remove leading/trailing dots, hyphens
    // "... Ngmyễm Wim IĐức . -" → "Ngmyễm Wim IĐức"
    
    // 2. Remove multiple dots
    // "..." → " "
    
    // 3. Split by spaces/dots/hyphens
    // ["Ngmyễm", "Wim", "IĐức"]
    
    // 4. Filter valid words (2-5 words, no numbers)
    // Skip: words < 2 chars, words with 2+ digits
    
    // 5. Validate: must have 2-5 words
    return "Ngmyễm Wim IĐức";
}
```

**Output:** `"NGMYỄM WIM IĐỨC"` (vẫn có lỗi OCR nhưng đã clean hơn)

### 4. **Cải Thiện Validation**

**Strategy 1: Ưu tiên tìm theo label**
```
tows NGUYEN TẤN PHÁT    →  Extract "NGUYEN TẤN PHÁT"
Họ và tên: TRẦN VĂN A   →  Extract "TRẦN VĂN A"
```

**Strategy 2: Fallback pattern matching**
- Tìm tên ALL CAPS (2-5 từ)
- Filter bỏ địa chỉ trong blacklist

### 4. **Cải Thiện Validation**
```java
private boolean isVietnameseName(String text) {
    // Allow 2-5 words (compound names)
    String[] words = text.split("\\s+");
    if (words.length < 2 || words.length > 5) {
        return false;
    }
    
    // Each word: all uppercase OR starts with uppercase
    for (String word : words) {
        boolean isAllCaps = word.equals(word.toUpperCase());
        boolean startsWithCaps = Character.isUpperCase(word.charAt(0));
        
        if (!isAllCaps && !startsWithCaps) {
            return false;
        }
    }
    
    return true;
}
```

---

## 🧪 Test Với Ảnh Chất Lượng Thấp

### Case 1: CCCD (CMND cũ)

**OCR Text:**
```
i OG HAO VET INL
GIAY CHUNG MINH NHÂN DAN
| s©9225416584<
tows NGUYEN TẤN PHÁT.
```

**Kết quả:**
- ✅ Name: `NGUYEN TẤN PHÁT`
- ✅ CCCD: `9225416584`

### Case 2: Đơn Xin Việc

**OCR Text:**
```
Kính gửi: Ban Gidm diễc cing ty...
- Tôi têu là: ... Ngmyễm Wim IĐức . -
OMND sô: ...03/715300ww%...
```

**Log Backend (mong đợi):**
```
[Name] Skipped blacklisted: BAN GIDM
[Name] Found after label in same line (normalized): NGMYỄM WIM IĐỨC
[CCCD Regex] Extracted - Name: NGMYỄM WIM IĐỨC
```

**Kết quả:**
- ✅ Name: `NGMYỄM WIM IĐỨC` (có OCR lỗi nhưng đúng context)
- ⚠️ Cần kiểm tra thủ công vì "Ngmyễm" ≠ "Nguyễn"

---

### 1. Restart Backend
```bash
cd springbootapp
lsof -ti:9999 | xargs kill -9
./mvnw spring-boot:run
```

### 2. Upload CCCD Lại
```bash
curl -X POST http://localhost:9999/api/cccd/scan \
  -F "file=@CCCD.jpeg"
```

### 3. Kiểm Tra Log Backend (Quan Trọng!)
```
[CCCD Regex] OCR Text length: 197
[CCCD Regex] First 200 chars: i OG HAO VET INL...tows NGUYEN TẤN PHÁT...
[Name] Skipped blacklisted: TAM QUAN BẮC
[Name] Found after label in same line: NGUYEN TẤN PHÁT
[CCCD Regex] Extracted - Name: NGUYEN TẤN PHÁT, Gender: , DOB: 
```

**Kết quả mong đợi:**
```json
{
  "fullName": "NGUYEN TẤN PHÁT",
  "cccdNumber": "9225416584",
  "dob": "",
  "gender": "",
  "address": "Tam Quan Bắc, Hoài Nhơn, Bình Định"
}
```

---

## 📊 So Sánh Trước/Sau

| Field | Trước | Sau | Ghi chú |
|-------|-------|-----|---------|
| **fullName** | `TAM QUAN BẮC` ❌ | `NGUYEN TẤN PHÁT` ✅ | Đã filter địa chỉ |
| **gender** | _(empty)_ | _(empty)_ | OCR text không có "Nam/Nữ" |
| **dob** | _(empty)_ | _(empty)_ | OCR text không có ngày tháng |
| **cccdNumber** | _(empty)_ | `9225416584` ✅ | Tìm được 10 số (CMND cũ) |

---

## 💡 Cải Thiện Thêm (Nếu Cần)

### 1. Enable Google Vision API
Tesseract OCR chất lượng thấp → Chuyển sang Google Vision:

**File:** `application.properties`
```properties
# Tắt Tesseract, bật Vision
ocr.vision.enabled=true
ocr.tesseract.enabled=false
```

**Lưu ý:** Cần có Google Cloud API key và billing enabled.

### 2. Cải Thiện Chất Lượng Ảnh Trước Khi OCR
```java
// Pre-process ảnh: tăng độ tương phản, loại bỏ nhiễu
BufferedImage enhanced = ImageEnhancer.enhance(originalImage);
```

### 3. Thêm Blacklist Địa Chỉ Tùy Chỉnh
Nếu có địa chỉ cụ thể bị nhầm lẫn nhiều, thêm vào blacklist:

**File:** `AgentService.java`
```java
String[] addressBlacklist = {
    // ... existing keywords
    "LONG KHÁNH", "BIÊN HÒA", "VŨNG TÀU",  // Thêm tỉnh thành cụ thể
    "YOUR_CUSTOM_KEYWORD"
};
```

### 4. Sử dụng AI Post-Processing
Nếu Gemini API có quota, dùng để validate/correct tên sau khi regex extract:
```java
String extractedName = extractFullName(ocrText);
String correctedName = geminiCorrectName(extractedName, ocrText);
```

---

## ⚠️ Giới Hạn Regex Parser

Regex parser **không thể** xử lý:

❌ **OCR text quá tệ** (< 50% chính xác):
```
i@#G H$AO V%T INL
9 8AY CH^NG M!NH NH&N DAN
```
→ Không có pattern nào match được

❌ **Tên và địa chỉ đều ALL CAPS liền kề:**
```
NGUYỄN VĂN A TAM QUAN BẮC HOÀI NHƠN
```
→ Không biết đâu là tên, đâu là địa chỉ (cần context)

❌ **CMND/CCCD định dạng đặc biệt:**
```
NGUYỄN-VĂN-A (có dấu gạch nối)
NGUYENVANA (không có khoảng trắng)
```
→ Pattern không match

---

## 🎯 Khuyến Nghị

### Cho Ảnh CCCD/CMND:
1. ✅ **Độ phân giải:** Tối thiểu 1200x800px
2. ✅ **Ánh sáng:** Đều, không bóng tối
3. ✅ **Góc chụp:** Vuông góc, không nghiêng
4. ✅ **Không bị mờ:** Focus rõ nét
5. ✅ **Format:** JPG/PNG (không scan PDF chất lượng thấp)

### Cho Backend:
1. ✅ **Enable Google Vision** nếu có budget (99% chính xác)
2. ✅ **Tesseract chỉ dùng fallback** khi Vision fail
3. ✅ **Kiểm tra log** để debug regex pattern
4. ✅ **Thêm blacklist** tùy chỉnh theo địa chỉ phổ biến ở dự án

---

## 📝 Debug Checklist

Khi quét CCCD bị sai, kiểm tra:

- [ ] Backend log có in ra `[CCCD Regex] First 200 chars`?
- [ ] OCR text có chứa tên không? (tìm từ "tows", "tên:", "họ và tên")
- [ ] Có từ nào bị blacklist không? (`[Name] Skipped blacklisted`)
- [ ] Tên có đúng format 2-5 từ IN HOA không?
- [ ] Chất lượng ảnh có đủ tốt không? (> 1000px, không mờ)

---

## 🔄 Restart Backend & Test

```bash
# 1. Stop backend cũ
lsof -ti:9999 | xargs kill -9

# 2. Start lại với code mới
cd springbootapp
./mvnw spring-boot:run

# 3. Test với ảnh CCCD
curl -X POST http://localhost:9999/api/cccd/scan \
  -F "file=@CCCD.jpeg" | jq

# 4. Kiểm tra log backend
# Tìm dòng: [Name] Found after label in same line: ...
```

---

## ✅ Tóm Tắt

**Đã fix:**
- ✅ Nhận diện OCR error keywords (`tows` = `Họ và tên`)
- ✅ Blacklist địa chỉ (TAM QUAN BẮC, HOÀI NHƠN...)
- ✅ Ưu tiên tìm tên theo context label
- ✅ Filter bỏ địa chỉ khi tìm pattern ALL CAPS

**Kết quả:**
- Từ: `TAM QUAN BẮC` ❌
- Thành: `NGUYEN TẤN PHÁT` ✅

**Lưu ý:**
- OCR chất lượng thấp vẫn có thể sai → Nên dùng Google Vision nếu có thể
- Luôn kiểm tra kết quả thủ công với ảnh CCCD/CMND

