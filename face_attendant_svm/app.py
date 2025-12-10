"""
Face Attendance System API - FastAPI Application
"""
import os
import sqlite3
import numpy as np
import cv2
import joblib
import subprocess
import platform
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging

try:
    import face_recognition
except ImportError as e:
    raise ImportError(f"Thiếu thư viện 'face_recognition': {e}")

# Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Face Attendance System API",
    description="API cho hệ thống điểm danh khuôn mặt",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============= CONFIG =============
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
FACES_DIR = os.path.join(BASE_DIR, "student-face")
DB_PATH = os.path.join(BASE_DIR, "students.db")

for d in [DATA_DIR, MODELS_DIR, FACES_DIR]:
    os.makedirs(d, exist_ok=True)

TABLE_NAME = "Student"
THRESHOLD = 0.55

# ============= DATABASE =============
def ensure_schema():
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute(f"""
            CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                student_name TEXT NOT NULL,
                session TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                confidence REAL
            )
        """)
        conn.commit()
    finally:
        conn.close()

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "Face Attendance API"}

@app.post("/api/register")
async def register_student(
    student_id: str = Form(...),
    student_name: str = Form(...),
    email: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    try:
        ensure_schema()
        temp_path = f"/tmp/{file.filename}"
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        image = face_recognition.load_image_file(temp_path)
        embeddings = face_recognition.face_encodings(image)
        if not embeddings:
            raise ValueError("No face detected")
        
        try:
            X = np.load(os.path.join(DATA_DIR, "embeddings.npy"))
            y = np.load(os.path.join(DATA_DIR, "labels.npy"), allow_pickle=True)
        except:
            X = np.array([]).reshape(0, 128)
            y = np.array([])
        
        X = np.vstack([X, embeddings[0]])
        y = np.append(y, student_id)
        np.save(os.path.join(DATA_DIR, "embeddings.npy"), X)
        np.save(os.path.join(DATA_DIR, "labels.npy"), y)
        
        conn = sqlite3.connect(DB_PATH)
        conn.execute(f"INSERT OR REPLACE INTO {TABLE_NAME} (id, name, email) VALUES (?, ?, ?)",
                    (student_id, student_name, email))
        conn.commit()
        conn.close()
        
        os.remove(temp_path)
        return {"success": True, "message": f"Registered {student_name}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/train")
async def train_model():
    try:
        from sklearn.svm import SVC
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
        
        X = np.load(os.path.join(DATA_DIR, "embeddings.npy"))
        y = np.load(os.path.join(DATA_DIR, "labels.npy"), allow_pickle=True)
        
        scaler = StandardScaler()
        X_norm = scaler.fit_transform(X)
        
        X_train, X_test, y_train, y_test = train_test_split(X_norm, y, test_size=0.2, random_state=42)
        
        model = SVC(kernel='linear', probability=True)
        model.fit(X_train, y_train)
        
        acc = accuracy_score(y_test, model.predict(X_test))
        
        joblib.dump(model, os.path.join(MODELS_DIR, "svm_model.pkl"))
        joblib.dump(scaler, os.path.join(MODELS_DIR, "normalizer.pkl"))
        
        return {"success": True, "accuracy": float(acc), "samples": len(X)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/attendance")
async def check_attendance(file: UploadFile = File(...)):
    try:
        model = joblib.load(os.path.join(MODELS_DIR, "svm_model.pkl"))
        scaler = joblib.load(os.path.join(MODELS_DIR, "normalizer.pkl"))
        
        temp_path = f"/tmp/{file.filename}"
        contents = await file.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        image = face_recognition.load_image_file(temp_path)
        embeddings = face_recognition.face_encodings(image)
        if not embeddings:
            return {"recognized": False, "message": "No face detected"}
        
        X_norm = scaler.transform([embeddings[0]])
        pred = model.predict(X_norm)[0]
        prob = model.predict_proba(X_norm)[0].max()
        
        if prob >= THRESHOLD:
            conn = sqlite3.connect(DB_PATH)
            conn.execute("INSERT INTO attendance (student_id, student_name, confidence) VALUES (?, ?, ?)",
                        (pred, pred, prob))
            conn.commit()
            conn.close()
            return {"recognized": True, "student_id": pred, "confidence": float(prob)}
        
        os.remove(temp_path)
        return {"recognized": False, "confidence": float(prob)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/students")
async def get_students():
    ensure_schema()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM {TABLE_NAME}")
    rows = cur.fetchall()
    conn.close()
    return {"success": True, "students": [dict(r) for r in rows]}

@app.get("/api/attendance-logs")
async def get_logs():
    ensure_schema()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 100")
    rows = cur.fetchall()
    conn.close()
    return {"success": True, "logs": [dict(r) for r in rows]}

@app.delete("/api/attendance-logs")
async def delete_logs():
    ensure_schema()
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM attendance")
    conn.commit()
    conn.close()
    return {"success": True, "message": "Attendance logs deleted"}

@app.delete("/api/students/{student_id}")
async def delete_student(student_id: str):
    ensure_schema()
    conn = sqlite3.connect(DB_PATH)
    conn.execute(f"DELETE FROM {TABLE_NAME} WHERE id = ?", (student_id,))
    conn.commit()
    conn.close()
    return {"success": True, "message": f"Deleted {student_id}"}

@app.post("/api/reset")
async def reset():
    try:
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
        for f in ["embeddings.npy", "labels.npy"]:
            p = os.path.join(DATA_DIR, f)
            if os.path.exists(p):
                os.remove(p)
        ensure_schema()
        return {"success": True, "message": "System reset"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
