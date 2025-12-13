# Face Attendance System - Environment Setup

MacOs/Linux chạy:
cd face_attendant_svm
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_api.txt
bash startPythonApi.sh


Windown chạy:
cd face_attendant_svm
python3 -m venv venv
venv\Scripts\activate
pip install -r requirements_api.txt
bash startPythonApi.sh

## Prerequisites
- Python 3.12 or higher
- pip (Python package installer)

## Setup Instructions

### 1. Create Virtual Environment
```bash
cd face_attendant_svm
python3 -m venv venv
```

### 2. Activate Virtual Environment

**macOS/Linux:**
```bash
source venv/bin/activate
```

**Windows:**
```cmd
venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Verify Installation
```bash
python check_db.py
```

## Important Notes

⚠️ **Never commit `venv/` or `.venv/` to Git!**

These directories contain large Python packages and are platform-specific. Each developer should create their own virtual environment locally.

## Troubleshooting

### Issue: pip install fails
- Ensure you're using Python 3.12+: `python --version`
- Upgrade pip: `pip install --upgrade pip`

### Issue: OpenCV installation error
- macOS: `brew install opencv`
- Ubuntu: `sudo apt-get install python3-opencv`

### Issue: Database connection error
- Check SQL Server is running on localhost:1433
- Verify credentials in config file

## Deactivate Environment
When done working:
```bash
deactivate
```