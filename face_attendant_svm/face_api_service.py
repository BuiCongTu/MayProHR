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

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

SVM_PATH = os.path.join(MODELS_DIR, "svm_model.pkl")
SCALER_PATH = os.path.join(MODELS_DIR, "normalizer.pkl")
EMBEDDINGS_PATH = os.path.join(DATA_DIR, "embeddings.npy")
LABELS_PATH = os.path.join(DATA_DIR, "labels.npy")

# Runtime config
# Slightly lower defaults to reduce false negatives during recognition
FACE_THRESHOLD = float(os.environ.get("FACE_THRESHOLD", "0.60"))
MIN_GAP = float(os.environ.get("FACE_MIN_GAP", "0.12"))
FACE_MODEL_VERSION = os.environ.get("FACE_MODEL_VERSION", "v1.0")

FACE_REGISTER_BLOCK_MASK = os.environ.get("FACE_REGISTER_BLOCK_MASK", "1").strip().lower() in ("1", "true", "yes", "on")
FACE_MASK_SCORE_THRESHOLD = float(os.environ.get("FACE_MASK_SCORE_THRESHOLD", "0.50"))

FACE_MASK_DEBUG = os.environ.get("FACE_MASK_DEBUG", "0").strip().lower() in ("1", "true", "yes", "on")
FACE_MASK_FAIL_CLOSED = os.environ.get("FACE_MASK_FAIL_CLOSED", "0").strip().lower() in ("1", "true", "yes", "on")
FACE_MIN_FACE_SIZE = int(os.environ.get("FACE_MIN_FACE_SIZE", "90"))

# Fallback using nearest-neighbor distance on raw embeddings
FACE_FALLBACK_ENABLED = os.environ.get("FACE_FALLBACK_ENABLED", "1").strip().lower() in ("1", "true", "yes", "on")
FACE_FALLBACK_DISTANCE_THRESHOLD = float(os.environ.get("FACE_FALLBACK_DISTANCE_THRESHOLD", "0.58"))
FACE_FALLBACK_SECOND_GAP = float(os.environ.get("FACE_FALLBACK_SECOND_GAP", "0.02"))

# Duplicate detection during registration (detect same face used for different employees)
FACE_DUPLICATE_CHECK_ENABLED = os.environ.get("FACE_DUPLICATE_CHECK_ENABLED", "1").strip().lower() in ("1", "true", "yes", "on")
FACE_DUPLICATE_DISTANCE_THRESHOLD = float(os.environ.get("FACE_DUPLICATE_DISTANCE_THRESHOLD", "0.55"))

# Cache models
_model = None
_scaler = None
_embeddings = None
_labels = None


def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(MODELS_DIR, exist_ok=True)


def load_models():
    global _model, _scaler, _embeddings, _labels
    try:
        ensure_dirs()

        if os.path.exists(SVM_PATH) and os.path.exists(SCALER_PATH):
            _model = joblib.load(SVM_PATH)
            _scaler = joblib.load(SCALER_PATH)
            logger.info("Models loaded successfully")
        else:
            _model = None
            _scaler = None
            logger.warning("Models not found. Please train first.")

        if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(LABELS_PATH):
            _embeddings = np.load(EMBEDDINGS_PATH)
            _labels = np.load(LABELS_PATH, allow_pickle=True)
            logger.info(f"Data loaded: {_embeddings.shape[0]} samples")
        else:
            _embeddings = None
            _labels = None

    except Exception as e:
        logger.error(f"Error loading models: {e}")
        _model = None
        _scaler = None
        _embeddings = None
        _labels = None


def base64_to_image(base64_string: str):
    try:
        if not base64_string:
            return None

        # Remove data URI header if exists
        if "," in base64_string:
            base64_string = base64_string.split(",", 1)[1]

        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"Error decoding base64: {e}")
        return None



def detect_mask(frame, face_location):
    """
    Heuristic mask detection - Improved accuracy.
    Returns: (is_masked: bool, debug_info: dict)
    """
    debug_info = {
        "threshold": FACE_MASK_SCORE_THRESHOLD,
        "minFaceSize": FACE_MIN_FACE_SIZE,
        "regions": [],
        "avgScore": None,
        "allRegionsSuspicious": None,
        "faceSize": None
    }

    try:
        (top, right, bottom, left) = face_location
        face_height = bottom - top
        face_width = right - left
        debug_info["faceSize"] = {"w": int(face_width), "h": int(face_height)}

        # Too small face => noisy mask detection => skip
        if face_height < FACE_MIN_FACE_SIZE or face_width < FACE_MIN_FACE_SIZE:
            debug_info["skipped"] = f"face_too_small(min={FACE_MIN_FACE_SIZE})"
            return False, debug_info

        # Regions (relative to face) - Improved positioning
        nose_top = top + int(face_height * 0.42)
        nose_bottom = top + int(face_height * 0.62)
        nose_left = left + int(face_width * 0.38)
        nose_right = right - int(face_width * 0.38)

        mouth_top = top + int(face_height * 0.62)
        mouth_bottom = top + int(face_height * 0.82)
        mouth_left = left + int(face_width * 0.28)
        mouth_right = right - int(face_width * 0.28)

        chin_top = top + int(face_height * 0.78)
        chin_bottom = bottom
        chin_left = left + int(face_width * 0.22)
        chin_right = right - int(face_width * 0.22)

        # Clamp
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

        regions = [
            (frame[nose_top:nose_bottom, nose_left:nose_right], "nose"),
            (frame[mouth_top:mouth_bottom, mouth_left:mouth_right], "mouth"),
            (frame[chin_top:chin_bottom, chin_left:chin_right], "chin"),
        ]

        mask_scores = []
        valid_regions = 0

        for region, name in regions:
            info = {"name": name}

            if region is None or region.size == 0 or region.shape[0] < 10 or region.shape[1] < 10:
                info["skip"] = "region_too_small"
                debug_info["regions"].append(info)
                continue

            valid_regions += 1
            gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
            brightness = float(np.mean(gray))
            info["brightness"] = brightness

            if brightness < 20:
                info["skip"] = "too_dark"
                debug_info["regions"].append(info)
                continue

            edges = cv2.Canny(gray, 50, 130)
            edge_ratio = float(np.sum(edges > 0) / edges.size) if edges.size > 0 else 0.0
            std_dev = float(np.std(gray))

            hsv = cv2.cvtColor(region, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)

            # Improved color uniformity calculation
            h_std = float(np.std(h))
            s_std = float(np.std(s))
            color_uniformity = float(1.0 - (h_std / 180.0 + s_std / 255.0) / 2.0)

            info["edgeRatio"] = edge_ratio
            info["stdDev"] = std_dev
            info["colorUniformity"] = color_uniformity

            mask_score = 0.0

            # More conservative thresholds
            if edge_ratio < 0.08:
                mask_score += 0.4
            elif edge_ratio < 0.12:
                mask_score += 0.2

            if std_dev < 25:
                mask_score += 0.3
            elif std_dev < 35:
                mask_score += 0.15

            if color_uniformity > 0.80:
                mask_score += 0.25
            elif color_uniformity > 0.70:
                mask_score += 0.1

            info["maskScore"] = float(mask_score)
            debug_info["regions"].append(info)

            mask_scores.append(mask_score)

        if not mask_scores or valid_regions < 2:
            debug_info["skipped"] = "insufficient_valid_regions"
            return False, debug_info

        avg_mask_score = float(np.mean(mask_scores))
        # Require ALL regions to be suspicious (stricter logic)
        all_regions_suspicious = len(mask_scores) >= 3 and all(score >= 0.50 for score in mask_scores)

        debug_info["avgScore"] = avg_mask_score
        debug_info["allRegionsSuspicious"] = bool(all_regions_suspicious)
        debug_info["validRegions"] = valid_regions

        # Only flag as masked if BOTH conditions are true
        is_masked = all_regions_suspicious or (avg_mask_score >= FACE_MASK_SCORE_THRESHOLD + 0.10)

        if FACE_MASK_DEBUG:
            logger.info(
                f"[MASK_DEBUG] face={debug_info['faceSize']} avg={avg_mask_score:.3f} "
                f"thr={FACE_MASK_SCORE_THRESHOLD:.3f} allSus={all_regions_suspicious} "
                f"scores={[f'{s:.2f}' for s in mask_scores]}"
            )

        return bool(is_masked), debug_info

    except Exception as e:
        logger.error(f"Error in mask detection: {e}")
        debug_info["error"] = str(e)
        return bool(FACE_MASK_FAIL_CLOSED), debug_info


def detect_hat(frame, face_location):
    """
    Quick heuristic hat/cap detection (not perfect).
    Returns: True if suspicious.
    """
    try:
        (top, right, bottom, left) = face_location
        h = bottom - top
        w = right - left

        # Forehead region
        fh_top = max(0, top)
        fh_bottom = min(frame.shape[0], top + int(h * 0.25))
        fh_left = max(0, left + int(w * 0.20))
        fh_right = min(frame.shape[1], right - int(w * 0.20))

        if fh_bottom <= fh_top or fh_right <= fh_left:
            return False

        region = frame[fh_top:fh_bottom, fh_left:fh_right]
        if region is None or region.size == 0 or region.shape[0] < 10 or region.shape[1] < 10:
            return False

        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        brightness = float(np.mean(gray))
        std_dev = float(np.std(gray))

        if brightness < 35.0 and std_dev < 22.0:
            return True

        return False
    except Exception as e:
        logger.error(f"Error in hat detection: {e}")
        return False


def detect_glasses(frame, face_location):
    """
    Allowed. Detection is optional, keep false to avoid false positives.
    """
    return False


def check_duplicate_face(embedding, user_id, embeddings, labels):
    """
    Check if embedding matches any OTHER user's face.
    Returns: (is_duplicate: bool, duplicate_user_id: int|None, distance: float)
    """
    try:
        if embeddings is None or len(embeddings) == 0:
            return False, None, None

        # Compute distances to all stored embeddings
        distances = face_recognition.face_distance(embeddings, embedding)
        labels_str = labels.astype(str)

        # Find closest match for DIFFERENT users
        for idx in np.argsort(distances):
            stored_user_id = int(labels_str[idx])
            distance = float(distances[idx])

            # Skip same user (re-registration is OK)
            if stored_user_id == user_id:
                continue

            # Found match with different user
            if distance <= FACE_DUPLICATE_DISTANCE_THRESHOLD:
                return True, stored_user_id, distance

        return False, None, None
    except Exception as e:
        logger.error(f"Error in check_duplicate_face: {e}")
        return False, None, None


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "service": "Face Recognition API",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/api/face/config", methods=["GET"])
def face_config():
    return jsonify({
        "success": True,
        "modelVersion": FACE_MODEL_VERSION,
        "recognitionThreshold": FACE_THRESHOLD,
        "minGap": MIN_GAP,
        "registerBlockMask": FACE_REGISTER_BLOCK_MASK,
        "maskScoreThreshold": FACE_MASK_SCORE_THRESHOLD,
        "minFaceSize": FACE_MIN_FACE_SIZE
    })


@app.route("/api/face/status", methods=["GET"])
def face_status():
    """
    Get training data status.
    Response: {success: bool, numSamples: int, numUsers: int, modelTrained: bool}
    """
    try:
        num_samples = 0
        num_users = 0
        model_trained = False

        if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(LABELS_PATH):
            embeddings = np.load(EMBEDDINGS_PATH)
            labels = np.load(LABELS_PATH, allow_pickle=True)
            num_samples = len(embeddings)
            num_users = int(len(np.unique(labels)))

        if os.path.exists(SVM_PATH) and os.path.exists(SCALER_PATH):
            model_trained = True

        return jsonify({
            "success": True,
            "numSamples": num_samples,
            "numUsers": num_users,
            "modelTrained": model_trained,
            "trainReady": num_samples >= 2 and num_users >= 2,
            "message": (
                "Ready to train" if (num_samples >= 2 and num_users >= 2)
                else f"Need more data: {num_samples}/2 samples, {num_users}/2 users"
            )
        }), 200
    except Exception as e:
        logger.error(f"Error in face_status: {e}")
        return jsonify({
            "success": False,
            "message": f"Status check failed: {str(e)}"
        }), 500


@app.route("/api/face/register", methods=["POST"])
def register_face():
    """
    Register face for user.
    Request: {userId: int, imageBase64: string, fullName: string}
    Response: {success: bool, message: string, userId: int, embedding: array, maskDetected: bool, hatDetected: bool, glassesDetected: bool, maskDebug?: object}
    """
    try:
        data = request.json or {}
        user_id = data.get("userId")
        image_base64 = data.get("imageBase64")
        full_name = data.get("fullName", "")

        if user_id is None or not image_base64:
            return jsonify({
                "success": False,
                "message": "userId and imageBase64 are required"
            }), 400

        img = base64_to_image(image_base64)
        if img is None:
            return jsonify({
                "success": False,
                "message": "Invalid image format"
            }), 400

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return jsonify({
                "success": False,
                "message": "No face detected in image"
            }), 400

        if len(face_locations) > 1:
            return jsonify({
                "success": False,
                "message": "Multiple faces detected. Please ensure only one face in image"
            }), 400

        face_location = face_locations[0]

        is_wearing_mask, mask_debug = detect_mask(img, face_location)
        is_wearing_hat = bool(detect_hat(img, face_location))
        is_wearing_glasses = bool(detect_glasses(img, face_location))

        if is_wearing_hat:
            payload = {
                "success": False,
                "message": "Vui lòng không đội mũ khi đăng ký khuôn mặt",
                "hatDetected": True,
                "maskDetected": bool(is_wearing_mask),
                "glassesDetected": bool(is_wearing_glasses)
            }
            if FACE_MASK_DEBUG:
                payload["maskDebug"] = mask_debug
            return jsonify(payload), 400

        if FACE_REGISTER_BLOCK_MASK and is_wearing_mask:
            payload = {
                "success": False,
                "message": "Vui lòng tháo khẩu trang khi đăng ký khuôn mặt",
                "maskDetected": True,
                "hatDetected": bool(is_wearing_hat),
                "glassesDetected": bool(is_wearing_glasses)
            }
            if FACE_MASK_DEBUG:
                payload["maskDebug"] = mask_debug
            return jsonify(payload), 400

        face_encodings = face_recognition.face_encodings(
            rgb_img,
            [face_location],
            num_jitters=10,
            model="large"
        )
        if not face_encodings:
            return jsonify({
                "success": False,
                "message": "Failed to generate face encoding"
            }), 400

        embedding = face_encodings[0]

        ensure_dirs()
        if os.path.exists(EMBEDDINGS_PATH) and os.path.exists(LABELS_PATH):
            embeddings = np.load(EMBEDDINGS_PATH)
            labels = np.load(LABELS_PATH, allow_pickle=True)

            # Check for duplicate face (same face used for different employee)
            if FACE_DUPLICATE_CHECK_ENABLED:
                is_duplicate, dup_user_id, dup_distance = check_duplicate_face(embedding, user_id, embeddings, labels)
                if is_duplicate:
                    logger.warning(
                        f"Duplicate face detected: user {user_id} has same face as user {dup_user_id} (distance={dup_distance:.3f})"
                    )
                    return jsonify({
                        "success": False,
                        "message": f"Error: This face is already registered for another employee (ID: {dup_user_id}). "
                                   f"Please use a different face or contact administrator.",
                        "isDuplicate": True,
                        "duplicateUserId": int(dup_user_id),
                        "distance": float(dup_distance),
                        "duplicateThreshold": FACE_DUPLICATE_DISTANCE_THRESHOLD
                    }), 400

            labels_str = labels.astype(str)
            if str(user_id) in labels_str:
                keep_mask = labels_str != str(user_id)
                embeddings = embeddings[keep_mask]
                labels = labels[keep_mask]

            embeddings = np.vstack([embeddings, embedding])
            labels = np.append(labels, str(user_id))
        else:
            embeddings = np.array([embedding])
            labels = np.array([str(user_id)])

        np.save(EMBEDDINGS_PATH, embeddings)
        np.save(LABELS_PATH, labels)

        logger.info(f"Face registered for user {user_id} ({full_name})")

        return jsonify({
            "success": True,
            "message": f"Face registered successfully for {full_name}",
            "userId": int(user_id),
            "embedding": embedding.tolist(),
            "maskDetected": False,
            "hatDetected": False,
            "glassesDetected": bool(is_wearing_glasses)
        }), 200

    except Exception as e:
        logger.error(f"Error in register_face: {e}")
        return jsonify({
            "success": False,
            "message": f"Registration failed: {str(e)}"
        }), 500


@app.route("/api/face/recognize", methods=["POST"])
def recognize_face():
    """
    Recognize face for check-in/check-out.
    Request: {imageBase64: string, scanType: 'CHECK_IN'|'CHECK_OUT'}
    Response: {success: bool, userId: int, confidence: float, scanType: string}
    """
    try:
        data = request.json or {}
        image_base64 = data.get("imageBase64")
        scan_type = data.get("scanType", "CHECK_IN")

        if not image_base64:
            return jsonify({
                "success": False,
                "message": "imageBase64 is required"
            }), 400

        if _model is None or _scaler is None:
            load_models()

        if _model is None or _scaler is None:
            return jsonify({
                "success": False,
                "message": "Model not trained. Please train the model first"
            }), 503

        img = base64_to_image(image_base64)
        if img is None:
            return jsonify({
                "success": False,
                "message": "Invalid image format"
            }), 400

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        face_locations = face_recognition.face_locations(rgb_img, model="hog")
        if not face_locations:
            return jsonify({
                "success": False,
                "message": "No face detected"
            }), 400

        # Pick largest face
        if len(face_locations) > 1:
            areas = [(b - t) * (r - l) for (t, r, b, l) in face_locations]
            idx = int(np.argmax(areas))
            face_location = face_locations[idx]
        else:
            face_location = face_locations[0]

        # Optional: run mask heuristic for debugging (does not block recognition)
        mask_suspected = False
        mask_debug = None
        try:
            mask_suspected, mask_debug = detect_mask(img, face_location)
        except Exception as _:
            mask_suspected = False

        face_encodings = face_recognition.face_encodings(
            rgb_img,
            [face_location],
            num_jitters=8,
            model="large"
        )
        if not face_encodings:
            return jsonify({
                "success": False,
                "message": "Failed to generate face encoding"
            }), 400

        embedding = face_encodings[0]
        embedding_normalized = _scaler.transform([embedding])

        prediction = _model.predict(embedding_normalized)[0]
        probabilities = _model.predict_proba(embedding_normalized)[0]

        sorted_probs = np.sort(probabilities)[::-1]
        confidence = float(sorted_probs[0]) if len(sorted_probs) > 0 else 0.0
        gap = float(sorted_probs[0] - sorted_probs[1]) if len(sorted_probs) > 1 else 1.0

        # Business fail => 200 (avoid breaking Spring RestTemplate)
        if confidence < FACE_THRESHOLD:
            # Try NN fallback on raw embeddings
            if FACE_FALLBACK_ENABLED and _embeddings is not None and _labels is not None and len(_embeddings) > 0:
                try:
                    # Compute Euclidean distances (same as face_recognition.face_distance)
                    distances = face_recognition.face_distance(_embeddings, embedding)
                    order = np.argsort(distances)
                    best_idx = int(order[0])
                    best_dist = float(distances[best_idx])
                    second_dist = float(distances[order[1]]) if len(order) > 1 else None
                    dist_gap = float(second_dist - best_dist) if second_dist is not None else None
                    best_label = _labels[best_idx]

                    if best_dist <= FACE_FALLBACK_DISTANCE_THRESHOLD and (dist_gap is None or dist_gap >= FACE_FALLBACK_SECOND_GAP):
                        user_id = int(best_label)
                        logger.info(
                            f"NN fallback accepted: userId={user_id}, dist={best_dist:.3f}, gap={dist_gap if dist_gap is not None else 'NA'}, svmConf={confidence:.3f}"
                        )
                        return jsonify({
                            "success": True,
                            "message": "Face recognized (NN fallback)",
                            "userId": user_id,
                            "confidence": confidence,
                            "distance": best_dist,
                            **({"distanceGap": dist_gap} if dist_gap is not None else {}),
                            "method": "nearest",
                            "threshold": FACE_THRESHOLD,
                            "minGap": MIN_GAP,
                            "fallbackDistanceThreshold": FACE_FALLBACK_DISTANCE_THRESHOLD,
                            **({"maskSuspected": bool(mask_suspected)} if FACE_MASK_DEBUG else {})
                        }), 200
                except Exception as _:
                    pass

            payload = {
                "success": False,
                "message": "Face not recognized (confidence too low)",
                "confidence": confidence,
                "threshold": FACE_THRESHOLD,
                "minGap": MIN_GAP
            }
            if FACE_MASK_DEBUG:
                payload.update({
                    "maskSuspected": bool(mask_suspected),
                    "maskDebug": mask_debug
                })
            return jsonify(payload), 200

        if gap < MIN_GAP:
            payload = {
                "success": False,
                "message": "Ambiguous match (multiple candidates)",
                "confidence": confidence,
                "gap": gap,
                "threshold": FACE_THRESHOLD,
                "minGap": MIN_GAP
            }
            if FACE_MASK_DEBUG:
                payload.update({
                    "maskSuspected": bool(mask_suspected),
                    "maskDebug": mask_debug
                })
            return jsonify(payload), 200

        user_id = int(prediction)
        logger.info(f"Face recognized: userId={user_id}, confidence={confidence:.2f}, gap={gap:.2f}, scanType={scan_type}")

        return jsonify({
            "success": True,
            "message": "Face recognized successfully",
            "userId": user_id,
            "confidence": confidence,
            "scanType": scan_type,
            "threshold": FACE_THRESHOLD,
            "minGap": MIN_GAP,
            **({"maskSuspected": bool(mask_suspected)} if FACE_MASK_DEBUG else {})
        }), 200

    except Exception as e:
        logger.error(f"Error in recognize_face: {e}")
        return jsonify({
            "success": False,
            "message": f"Recognition failed: {str(e)}"
        }), 500


@app.route("/api/face/train", methods=["POST"])
def train_model():
    """
    Train SVM model from stored embeddings/labels.
    Requires: at least 2 different users (classes)
    """
    try:
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(LABELS_PATH):
            return jsonify({
                "success": False,
                "message": "No training data found. Please register faces first"
            }), 400

        X = np.load(EMBEDDINGS_PATH)
        y = np.load(LABELS_PATH, allow_pickle=True)

        num_samples = len(X)
        num_users = int(len(np.unique(y)))

        if num_samples < 2:
            return jsonify({
                "success": False,
                "message": f"Insufficient data. Need at least 2 samples, but have {num_samples}",
                "numSamples": num_samples,
                "numUsers": num_users
            }), 400

        if num_users < 2:
            return jsonify({
                "success": False,
                "message": f"Insufficient users. Need at least 2 different employees, but have {num_users}. "
                           f"Current sample count: {num_samples}",
                "numSamples": num_samples,
                "numUsers": num_users
            }), 400

        from sklearn.preprocessing import StandardScaler
        scaler = StandardScaler()
        X_normalized = scaler.fit_transform(X)

        from sklearn.svm import SVC
        model = SVC(kernel="linear", probability=True, cache_size=500)
        model.fit(X_normalized, y)

        ensure_dirs()
        joblib.dump(model, SVM_PATH)
        joblib.dump(scaler, SCALER_PATH)

        load_models()

        logger.info(f"Model trained: {len(X)} samples, {num_users} users")

        return jsonify({
            "success": True,
            "message": "Model trained successfully",
            "numSamples": int(len(X)),
            "numUsers": num_users
        }), 200

    except Exception as e:
        logger.error(f"Error in train_model: {e}")
        return jsonify({
            "success": False,
            "message": f"Training failed: {str(e)}"
        }), 500


@app.route("/api/face/delete/<int:user_id>", methods=["DELETE"])
def delete_face(user_id: int):
    """
    Delete user's face data from embeddings/labels.
    """
    try:
        if not os.path.exists(EMBEDDINGS_PATH) or not os.path.exists(LABELS_PATH):
            return jsonify({
                "success": False,
                "message": "No data found"
            }), 404

        embeddings = np.load(EMBEDDINGS_PATH)
        labels = np.load(LABELS_PATH, allow_pickle=True).astype(str)

        keep_mask = labels != str(user_id)
        embeddings = embeddings[keep_mask]
        labels = labels[keep_mask]

        if len(embeddings) == 0:
            os.remove(EMBEDDINGS_PATH)
            os.remove(LABELS_PATH)
        else:
            np.save(EMBEDDINGS_PATH, embeddings)
            np.save(LABELS_PATH, labels)

        logger.info(f"Face data deleted for user {user_id}")

        return jsonify({
            "success": True,
            "message": f"Face data deleted for user {user_id}"
        }), 200

    except Exception as e:
        logger.error(f"Error in delete_face: {e}")
        return jsonify({
            "success": False,
            "message": f"Delete failed: {str(e)}"
        }), 500


if __name__ == "__main__":
    ensure_dirs()
    load_models()

    port = int(os.environ.get("PORT", 5001))
    debug_env = os.environ.get("FLASK_DEBUG", "0").strip().lower() in ("1", "true", "yes", "on")

    logger.info(
        "Starting Face Recognition API on port %s "
        "(threshold=%s, minGap=%s, modelVersion=%s, registerBlockMask=%s, maskThr=%s, minFace=%s, debug=%s)...",
        port, FACE_THRESHOLD, MIN_GAP, FACE_MODEL_VERSION, FACE_REGISTER_BLOCK_MASK,
        FACE_MASK_SCORE_THRESHOLD, FACE_MIN_FACE_SIZE, debug_env
    )

    app.run(host="0.0.0.0", port=port, debug=debug_env)