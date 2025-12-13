# MayPayHR - Hướng Dẫn Sử Dụng Nhanh

## Tổng Quan

Hệ thống chấm công nhân viên sử dụng nhận diện khuôn mặt với các thành phần chính:
- **React Frontend**: Giao diện người dùng (port 3000)
- **Spring Boot Backend**: API và business logic (port 8080)
- **Python Flask Service**: Nhận diện khuôn mặt (port 5000)

---
## A. Khởi Động Tất Cả 
- Python Mobile
- React web
- Spring boot backend

```bash
./start_all_services.sh
```

## B. Khởi Động từng module

### 1. Khởi động Module face_attendance_svm

```bash
cd face_attendant_svm
./startPythonApi.sh
```

Hoặc thủ công:
```bash
cd face_attendant_svm
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements_api.txt
python face_api_service.py
```

### 2️. Khởi động Spring Boot Backend

```bash
cd springbootapp
./mvnw spring-boot:run
```

### 3️. Khởi động React Frontend

```bash
cd reactapp
npm install
npm start
```

---

## C. Cấu Hình

### Spring Boot (application.properties)

Thêm vào file `springbootapp/src/main/resources/application.properties`:

```properties
# Face Recognition API
python.face-service.url=http://localhost:5001
face.recognition.api.url=http://localhost:5001
face.model.version=v1.0
face.confidence.threshold=0.7

# Connection timeout (milliseconds)
face.recognition.api.connection-timeout=5000

# Read timeout (milliseconds)
face.recognition.api.read-timeout=30000
```

### React (Proxy Configuration)

Thêm vào `reactapp/package.json`:

```json
{
  "proxy": "http://localhost:8080"
}
```

---

## 🎭 Quy Trình Sử Dụng

### 📝 1. Đăng Ký Khuôn Mặt (HR/Admin)

1. Truy cập: `http://localhost:3000/attendance/register`
2. Chọn nhân viên từ danh sách
3. Nhìn vào camera và chụp ảnh
4. Nhấn **"Huấn Luyện Mô Hình"** (bước quan trọng!)

**API Flow:**
```
React → POST /api/attendance/register-face
      → Spring Boot → POST /api/face/register
                    → Python Flask (lưu embedding)
      → Spring Boot → POST /api/face/train
                    → Python Flask (train SVM model)
```

### ✅ 2. Check-In (Nhân viên)

1. Truy cập: `http://localhost:3000/attendance/checkin`
2. Nhìn vào camera và nhấn **"Chụp"**
3. Hệ thống tự động nhận diện và chấm công

**API Flow:**
```
React → POST /api/attendance/checkin {imageBase64}
      → Spring Boot → POST /api/face/recognize
                    → Python Flask (nhận diện → userId + confidence)
      → Spring Boot → Lưu TbAttendance (timeIn, date, status)
      → React (hiển thị kết quả)
```

### 🚪 3. Check-Out (Nhân viên)

1. Truy cập: `http://localhost:3000/attendance/checkout`
2. Nhìn vào camera và nhấn **"Chụp"**
3. Hệ thống tự động cập nhật giờ ra

**API Flow:**
```
React → POST /api/attendance/checkout {imageBase64}
      → Spring Boot → POST /api/face/recognize
                    → Python Flask (nhận diện → userId)
      → Spring Boot → Cập nhật TbAttendance (timeOut, workingHours)
      → React (hiển thị tổng giờ làm việc)
```

### 📊 4. Xem Lịch Sử (Nhân viên)

1. Truy cập: `http://localhost:3000/attendance/history`
2. Chọn ngày
3. Xem danh sách chấm công (giờ vào, giờ ra, tổng giờ)

---

## 🛠️ API Endpoints

### Python Flask (port 5000)

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/health` | Health check |
| POST | `/api/face/register` | Đăng ký khuôn mặt |
| POST | `/api/face/recognize` | Nhận diện khuôn mặt |
| POST | `/api/face/train` | Huấn luyện SVM model |
| DELETE | `/api/face/delete/:userId` | Xóa dữ liệu khuôn mặt |

### Spring Boot (port 8080)

| Method | Endpoint | Mô Tả | Yêu cầu Auth |
|--------|----------|-------|--------------|
| POST | `/api/attendance/checkin` | Check-in | ❌ |
| POST | `/api/attendance/checkout` | Check-out | ❌ |
| POST | `/api/attendance/register-face` | Đăng ký khuôn mặt | ✅ HR/Admin |
| POST | `/api/attendance/train-model` | Huấn luyện model | ✅ HR/Admin |
| GET | `/api/attendance/history/:userId` | Lịch sử chấm công | ✅ |

---

## 🧪 Test API

Sử dụng script test:

```bash
./test_endpoints.sh
```

Hoặc test thủ công với curl:

```bash
# Health check Python
curl http://localhost:5000/health

# Health check Spring Boot
curl http://localhost:8080/actuator/health

# Check-in (cần imageBase64 thực)
curl -X POST http://localhost:8080/api/attendance/checkin \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "..."}'
```

---

## 🗄️ Database Schema

### TbUser (Nhân viên)
```sql
user_id (PK)
full_name
email
phone
department_id (FK)
role_id (FK)
status
```

### TbAttendance (Chấm công)
```sql
attendance_id (PK)
user_id (FK)
date
time_in
time_out
status (SUCCESS, LATE, ABSENT)
```

---

## ⚠️ Xử Lý Sự Cố

### 1. Python service không khởi động

```bash
# Kiểm tra port 5000
lsof -i :5000

# Nếu bị chiếm, kill process
kill -9 $(lsof -t -i:5000)

# Hoặc đổi port trong face_api_service.py
```

### 2. Spring Boot không kết nối được Python

```bash
# Kiểm tra Python service đang chạy
curl http://localhost:5000/health

# Kiểm tra config trong application.properties
face.recognition.api.url=http://localhost:5000
```

### 3. React không gọi được API

```bash
# Kiểm tra proxy trong package.json
"proxy": "http://localhost:8080"

# Hoặc dùng axios baseURL
axios.defaults.baseURL = 'http://localhost:8080';
```

### 4. Lỗi "Face not detected"

- Đảm bảo ánh sáng đủ
- Nhìn thẳng vào camera
- Không đeo khẩu trang
- Khoảng cách 50-100cm

### 5. Lỗi "Model not trained"

```bash
# Gọi API train model sau khi đăng ký
curl -X POST http://localhost:5000/api/face/train
```

---

## Bảo Mật

1. **JWT Authentication**: Endpoints HR/Admin yêu cầu JWT token
2. **HTTPS**: Khuyến nghị dùng HTTPS trong production
3. **Data Privacy**: Chỉ lưu embeddings, không lưu ảnh gốc
4. **Role-Based Access**: Phân quyền HR/Admin/Employee

---

## Performance

- **Face Recognition**: ~200-500ms
- **Check-in/Check-out**: ~1-2 giây (bao gồm nhận diện + lưu DB)
- **Training Model**: ~10-30 giây (tùy số lượng nhân viên)
- **Cache**: Embeddings và models được cache trong memory

---

## Tài Liệu Chi Tiết

Xem file `INTEGRATION_GUIDE.md` để biết thêm chi tiết về:
- Kiến trúc hệ thống
- API workflows
- Error handling
- Best practices

---

## Dừng Services

```bash
# Dừng tất cả
./stop_all_services.sh

# Hoặc thủ công
kill $(lsof -t -i:5000)  # Python
kill $(lsof -t -i:8080)  # Spring Boot
kill $(lsof -t -i:3000)  # React
```
