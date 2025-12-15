"""
Face Recognition API Service - Flask REST API
Xử lý đăng ký khuôn mặt, check-in, check-out cho nhân viên
Tích hợp với Spring Boot backend
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
import cv2
import base64
import face_recognition
import joblib
from datetime import datetime
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS cho React frontend

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cấu hình
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Model paths
SVM_PATH = os.path.join(MODELS_DIR, "svm_model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "normalizer.pkl")
EMBEDDINGS_PATH = os.path.join(DATA_DIR, "embeddings.npy")
LABELS_PATH = os.path.join(DATA_DIR, "labels.npy")

# Cache models
_model = None
_scaler = None
_embeddings = None
_labels = None


def ensure_dirs():
    """Tạo thư mục nếu chưa tồn tại"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)


def load_models():
    """Load trained models và data"""
    global _model, _scaler, _embeddings, _labels
    
    try:
        if os.path.exists(SVM_PATH) and os.path.exists(SCALER_PATH):
            _model = joblib.load(SVM_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Models loaded successfully")
        else:
            logger.warning("Models not found. Please train first.")
            
        if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(LABELS_PATH):
            _embeddings = np.load(EMBEDDINGS_PATH)
            _labels = np.load(LABELS_PATH, allow_pickle=True)
            logger.info(f"Data loaded: {_embeddings.shape[0]} samples")
    except Exception as e:
        logger.error(f"Error loading models: {e}")


def base64_to_image(base64_string):
    """Chuyển base64 string thành OpenCV image"""
    try:
        # Remove header if exists
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error decoding base64: {e}")
        return None


def detect_mask(frame, face_location):
    """
    Phát hiện khẩu trang - sử dụng logic từ registerFace.py
    Returns: True nếu phát hiện khẩu trang
    """
    try:
        (top, right, bottom, left) = face_location
        face_height = bottom - top
        face_width = right - left
        
        # Vùng mũi
        nose_top = top + int(face_height * 0.40)
        nose_bottom = top + int(face_height * 0.65)
        nose_left = left + int(face_width * 0.35)
        nose_right = right - int(face_width * 0.35)
        
        # Vùng miệng
        mouth_top = top + int(face_height * 0.60)
        mouth_bottom = top + int(face_height * 0.85)
        mouth_left = left + int(face_width * 0.25)
        mouth_right = right - int(face_width * 0.25)
        
        # Vùng cằm
        chin_top = top + int(face_height * 0.80)
        chin_bottom = bottom
        chin_left = left + int(face_width * 0.20)
        chin_right = right - int(face_width * 0.20)
        
        # Đảm bảo không vượt quá frame
        nose_top = max(0, nose_top)
        nose_bottom = min(frame.shape[0], nose_bottom)
        nose_left = max(0, nose_left)
        nose_right = min(frame.shape[1], nose_right)
        
        mouth_top = max(0, mouth_top)
        mouth_bottom = min(frame.shape[0], mouth_bottom)
        mouth_left = max(0, mouth_left)
        mouth_right = min(frame.shape[1], mouth_right)
        
        chin_top = max(0, chin_top)
        chin_bottom = min(frame.shape[0], chin_bottom)
        chin_left = max(0, chin_left)
        chin_right = min(frame.shape[1], chin_right)
        
        # Crop các vùng
        nose_region = frame[nose_top:nose_bottom, nose_left:nose_right]
        mouth_region = frame[mouth_top:mouth_bottom, mouth_left:mouth_right]
        chin_region = frame[chin_top:chin_bottom, chin_left:chin_right]
        
        mask_scores = []
        
        for region, name in [(nose_region, "nose"), (mouth_region, "mouth"), (chin_region, "chin")]:
            if region.shape[0] < 10 or region.shape[1] < 10:
                continue
            
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            brightness = np.mean(gray)
            
            if brightness < 25:
                continue
            
            # Edge detection
            edges = cv2.Canny(gray, 40, 120)
            edge_ratio = np.sum(edges > 0) / edges.size if edges.size > 0 else 0
            
            # Standard deviation
            std_dev = np.std(gray)
            
            # Color uniformity
            hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            color_uniformity = 1.0 - (np.std(h) / 180.0 + np.std(s) / 255.0) / 2.0
            
            # Calculate mask score
            mask_score = 0.0
            if edge_ratio < 0.10:
                mask_score += 0.5
            elif edge_ratio < 0.15:
                mask_score += 0.25
            
            if std_dev < 30:
                mask_score += 0.35
            elif std_dev < 40:
                mask_score += 0.2
            
            if color_uniformity > 0.75:
                mask_score += 0.3
            elif color_uniformity > 0.65:
                mask_score += 0.15
            
            mask_scores.append(mask_score)
        
        if not mask_scores:
            return False
        
        avg_mask_score = np.mean(mask_scores)
        max_mask_score = np.max(mask_scores)
        all_regions_suspicious = len(mask_scores) >= 3 and all(score >= 0.35 for score in mask_scores)
        
        is_masked = avg_mask_score > 0.40 or max_mask_score > 0.55 or all_regions_suspicious
        
        return is_masked
        
    except Exception as e:
        logger.error(f"Error in mask detection: {e}")
        return True  # Nếu lỗi, cho là có mask (an toàn)


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'Face Recognition API',
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/face/register', methods=['POST'])
def register_face():
    """
    Đăng ký khuôn mặt cho nhân viên mới
    Request: {userId: int, imageBase64: string, fullName: string}
    Response: {success: bool, message: string, embedding: array}
    """
    try:
        data = request.json
        user_id = data.get('userId')
        image_base64 = data.get('imageBase64')
        full_name = data.get('fullName', '')
        
        if not user_id or not image_base64:
            return jsonify({
                'success': False,
                'message': 'userId and imageBase64 are required'
            }), 400
        
        # Decode image
        img = base64_to_image(image_base64)
        if img is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image format'
            }), 400
        
        # Convert to RGB
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        
        if not face_locations:
            return jsonify({
                'success': False,
                'message': 'No face detected in image'
            }), 400
        
        if len(face_locations) > 1:
            return jsonify({
                'success': False,
                'message': 'Multiple faces detected. Please ensure only one face in image'
            }), 400
        
        face_location = face_locations[0]

        # Check for mask (tạm thời tắt để tránh false positive khi đăng ký)
        # Nếu sau này muốn bật lại, chỉ cần dùng detect_mask và xử lý theo nhu cầu.
        # is_wearing_mask = detect_mask(img, face_location)
        is_wearing_mask = False
        
        # Generate face encoding
        face_encodings = face_recognition.face_encodings(
            rgb_img, 
            [face_location],
            num_jitters=10,  # High quality
            model="large"
        )
        
        if not face_encodings:
            return jsonify({
                'success': False,
                'message': 'Failed to generate face encoding'
            }), 400
        
        embedding = face_encodings[0]
        
        # Load existing data
        ensure_dirs()
        if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(LABELS_PATH):
            embeddings = np.load(EMBEDDINGS_PATH)
            labels = np.load(LABELS_PATH, allow_pickle=True)
            
            # Check if user already exists
            if str(user_id) in labels:
                # Update existing
                mask = labels == str(user_id)
                embeddings = embeddings[~mask]
                labels = labels[~mask]
            
            # Append new
            embeddings = np.vstack([embeddings, embedding])
            labels = np.append(labels, str(user_id))
        else:
            embeddings = np.array([embedding])
            labels = np.array([str(user_id)])
        
        # Save
        np.save(EMBEDDINGS_PATH, embeddings)
        np.save(LABELS_PATH, labels)
        
        logger.info(f"Face registered for user {user_id} ({full_name})")
        
        return jsonify({
            'success': True,
            'message': f'Face registered successfully for {full_name}',
            'userId': user_id,
            'embedding': embedding.tolist()
        })
        
    except Exception as e:
        logger.error(f"Error in register_face: {e}")
        return jsonify({
            'success': False,
            'message': f'Registration failed: {str(e)}'
        }), 500


@app.route('/api/face/recognize', methods=['POST'])
def recognize_face():
    """
    Nhận diện khuôn mặt cho check-in/check-out
    Request: {imageBase64: string, scanType: 'CHECK_IN'|'CHECK_OUT'}
    Response: {success: bool, userId: int, confidence: float, fullName: string}
    """
    try:
        data = request.json
        image_base64 = data.get('imageBase64')
        scan_type = data.get('scanType', 'CHECK_IN')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'message': 'imageBase64 is required'
            }), 400
        
        # Load models if not loaded
        if _model is None or _scaler is None:
            load_models()
            
        if _model is None:
            return jsonify({
                'success': False,
                'message': 'Model not trained. Please train the model first'
            }), 503
        
        # Decode image
        img = base64_to_image(image_base64)
        if img is None:
            return jsonify({
                'success': False,
                'message': 'Invalid image format'
            }), 400
        
        # Convert to RGB
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Detect faces
        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        
        if not face_locations:
            return jsonify({
                'success': False,
                'message': 'No face detected'
            }), 400
        
        # Pick largest face
        if len(face_locations) > 1:
            areas = [(b-t)*(r-l) for (t,r,b,l) in face_locations]
            idx = int(np.argmax(areas))
            face_location = face_locations[idx]
        else:
            face_location = face_locations[0]
        
        # Generate face encoding
        face_encodings = face_recognition.face_encodings(
            rgb_img,
            [face_location],
            num_jitters=5,
            model="large"
        )
        
        if not face_encodings:
            return jsonify({
                'success': False,
                'message': 'Failed to generate face encoding'
            }), 400
        
        embedding = face_encodings[0]
        
        # Normalize
        embedding_normalized = _scaler.transform([embedding])
        
        # Predict
        prediction = _model.predict(embedding_normalized)[0]
        probabilities = _model.predict_proba(embedding_normalized)[0]
        
        max_prob = np.max(probabilities)
        confidence = float(max_prob)
        
        # Threshold check
        THRESHOLD = 0.55
        if confidence < THRESHOLD:
            return jsonify({
                'success': False,
                'message': 'Face not recognized (confidence too low)',
                'confidence': confidence
            }), 404
        
        # Check second best
        sorted_probs = np.sort(probabilities)[::-1]
        if len(sorted_probs) > 1:
            gap = sorted_probs[0] - sorted_probs[1]
            if gap < 0.15:  # Min confidence gap
                return jsonify({
                    'success': False,
                    'message': 'Ambiguous match (multiple candidates)',
                    'confidence': confidence
                }), 404
        
        user_id = int(prediction)
        
        logger.info(f"Face recognized: userId={user_id}, confidence={confidence:.2f}, scanType={scan_type}")
        
        return jsonify({
            'success': True,
            'message': 'Face recognized successfully',
            'userId': user_id,
            'confidence': confidence,
            'scanType': scan_type
        })
        
    except Exception as e:
        logger.error(f"Error in recognize_face: {e}")
        return jsonify({
            'success': False,
            'message': f'Recognition failed: {str(e)}'
        }), 500


@app.route('/api/face/train', methods=['POST'])
def train_model():
    """
    Huấn luyện model với dữ liệu hiện có
    Response: {success: bool, message: string, numSamples: int, numUsers: int}
    """
    try:
        # Load data
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(LABELS_PATH):
            return jsonify({
                'success': False,
                'message': 'No training data found. Please register faces first'
            }), 400
        
        X = np.load(EMBEDDINGS_PATH)
        y = np.load(LABELS_PATH, allow_pickle=True)
        
        if len(X) < 2:
            return jsonify({
                'success': False,
                'message': 'Insufficient data. Need at least 2 samples'
            }), 400
        
        num_users = len(np.unique(y))
        
        # Normalize
        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_normalized = scaler.fit_transform(X)
        
        # Train SVM
        from sklearn.svm import SVC
        model = SVC(kernel='linear', probability=True, cache_size=500)
        model.fit(X_normalized, y)
        
        # Save models
        ensure_dirs()
        joblib.dump(model, SVM_PATH)
        joblib.dump(scaler, SCALER_PATH)
        
        # Reload
        load_models()
        
        logger.info(f"Model trained: {len(X)} samples, {num_users} users")
        
        return jsonify({
            'success': True,
            'message': 'Model trained successfully',
            'numSamples': len(X),
            'numUsers': num_users
        })
        
    except Exception as e:
        logger.error(f"Error in train_model: {e}")
        return jsonify({
            'success': False,
            'message': f'Training failed: {str(e)}'
        }), 500


@app.route('/api/face/delete/<int:user_id>', methods=['DELETE'])
def delete_face(user_id):
    """
    Xóa face data của user
    """
    try:
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(LABELS_PATH):
            return jsonify({
                'success': False,
                'message': 'No data found'
            }), 404
        
        embeddings = np.load(EMBEDDINGS_PATH)
        labels = np.load(LABELS_PATH, allow_pickle=True)
        
        mask = labels != str(user_id)
        embeddings = embeddings[mask]
        labels = labels[mask]
        
        if len(embeddings) == 0:
            # Delete files if no data left
            os.remove(EMBEDDINGS_PATH)
            os.remove(LABELS_PATH)
        else:
            np.save(EMBEDDINGS_PATH, embeddings)
            np.save(LABELS_PATH, labels)
        
        logger.info(f"Face data deleted for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'Face data deleted for user {user_id}'
        })
        
    except Exception as e:
        logger.error(f"Error in delete_face: {e}")
        return jsonify({
            'success': False,
            'message': f'Delete failed: {str(e)}'
        }), 500


if __name__ == '__main__':
    ensure_dirs()
    load_models()
    
    port = int(os.environ.get('PORT', 5001))
    logger.info(f"Starting Face Recognition API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
