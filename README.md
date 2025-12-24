# MayProHR
May Professional Human Resources

ERD: [https://app.diagrams.net/#HBuiCongTu%2FMayProHR%2Fmain%2FMayProHR.drawio#%7B%22pageId%22%3A%22Qdr_kwHjScFgfIdC0VMU%22%7D](https://app.diagrams.net/#HBuiCongTu%2FMayProHR%2Fmain%2FERD_MayPay_27-11-2025.drawio#%7B%22pageId%22%3A%22W4VcvkPIQewVUlpZOtXx%22%7D)

### Setup Face Attendance Module:
```bash
cd face_attendant_svm
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# hoặc
venv\Scripts\activate      # Windows

pip install -r requirements_api.txt
```

Xem chi tiết tại: `face_attendant_svm/SETUP_ENVIRONMENT.md`

---- Flutter app Notification ----
Important: The backend requires a 'firebase-service-account.json' (get key from firebase console) file for flutter app push-notifications. This file is not in the repo for security. Get this file and place it in springbootapp/src/main/resources/.

---- Demo Overtime Automation Scheduler ----
Example:
To set specific time (in this exmple date:2025-12-24, time: 17:00:00): POST http://localhost:9999/api/automation/demo/set-time?datetime=2025-12-24T17:00:00 

To reset time to system time: POST http://localhost:9999/api/automation/demo/reset-time
