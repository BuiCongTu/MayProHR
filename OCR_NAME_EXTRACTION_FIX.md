# Sửa lỗi trích xuất tên từ OCR

## Vấn đề gặp phải

### Case 1: Tên bị thêm từ "TÔI"
- **OCR Text**: `"Tôi têu là: ... Ngmyễm Wim IĐức . -"`
- **Kết quả sai**: `"TÔI NGMYỄM WIM IĐỨC"`
- **Kết quả đúng**: `"NGMYỄM WIM IĐỨC"` (loại bỏ "TÔI")

### Case 2: Tên bị lấy sai hoàn toàn
- **OCR Text**: `"Hy và tên / a nang. __ Ngắn về ải gon trổ phá.\nLÊ THỊ THU VÂN"`
- **Kết quả sai**: `"NGUYỄN QUỐC HÙNG"` (tên người khác trong văn bản)
- **Kết quả đúng**: `"LÊ THỊ THU VÂN"`

## Nguyên nhân

1. **extractNameFromLine()** không loại bỏ từ "TÔI" sau khi xóa keyword
2. **extractFullName()** không nhận diện "Hy và tên" (lỗi OCR của "Họ và tên")
3. **Strategy 2** (pattern matching) tìm tên ALL CAPS bất kỳ trước khi Strategy 1 kiểm tra đủ context

## Giải pháp đã áp dụng

### 1. Thêm stopWords blacklist vào normalizeOcrName()

```java
// Blacklist words to remove
String[] stopWords = {"TÔI", "TOI", "CHÚN", "CHUN", "LÀ", "LA", "MÔI", "MOI"};

for (String word : words) {
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
    
    validWords.add(word);
}
```

**Kết quả**: "TÔI NGMYỄM WIM IĐỨC" → loại bỏ "TÔI" → "NGMYỄM WIM IĐỨC"

### 2. Cải thiện nhận diện "Họ và tên" với lỗi OCR

```java
// OCR common errors: "Hy và tên" (= "Họ và tên"), "tows", "tôi tên là:", "CMND số:"
if (lower.matches(".*(h[yoọ]\\s*v[aà]\\s*t[eê]n|tôi\\s*t[eê]n\\s*l[aà]|...).*")
```

**Pattern mới**: `h[yoọ]\\s*v[aà]\\s*t[eê]n` → nhận diện cả "Hy và tên", "Ho và ten", "Họ và tên"

### 3. Mở rộng tìm kiếm sau label (2-3 dòng thay vì 1)

```java
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
```

**Kết quả**: Sau khi phát hiện "Hy và tên", tìm tên ở dòng tiếp theo (line +1) và dòng line +2

## Cách kiểm tra

### 1. Restart backend

```bash
cd springbootapp
./mvnw clean compile -DskipTests
./mvnw spring-boot:run
```

### 2. Test với ảnh đơn xin việc có "Tôi tên là:"

```bash
curl -X POST http://localhost:8080/api/cccd/scan-application \
  -F "image=@path/to/application-form.jpg"
```

**Kết quả mong đợi**: Tên KHÔNG chứa "TÔI"

### 3. Test với ảnh có "Hy và tên" (OCR lỗi)

```bash
curl -X POST http://localhost:8080/api/cccd/scan-application \
  -F "image=@path/to/form-ocr-error.jpg"
```

**Kết quả mong đợi**: Trả về tên ở dòng sau "Hy và tên", KHÔNG phải tên ngẫu nhiên trong văn bản

## Các file đã sửa

| File | Thay đổi |
|------|----------|
| `AgentService.java` | Thêm stopWords trong `normalizeOcrName()` |
| `AgentService.java` | Cải thiện regex "Họ và tên" trong `extractFullName()` |
| `AgentService.java` | Mở rộng tìm kiếm sang line +2 sau label |

## Lưu ý

- **stopWords** hiện có: `TÔI, TOI, CHÚN, CHUN, LÀ, LA, MÔI, MOI`
- Nếu cần thêm từ khóa, update mảng `stopWords` trong `normalizeOcrName()`
- OCR pattern hiện nhận: "Họ và tên", "Hy và tên", "Ho và ten", "tôi tên là", "têu là", "name:"
- Debug log: `[Normalize] Removed stop word: TÔI`, `[Name] Found in line +2 after label`

## Build status

✅ BUILD SUCCESS (23/12/2025)
