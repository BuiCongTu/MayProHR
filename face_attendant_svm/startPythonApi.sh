#!/usr/bin/env bash
# Script: startPythonApi.sh
# Purpose: Activate virtual environment and start the Flask face recognition API service.
# Usage: ./startPythonApi.sh

set -euo pipefail

# Detect project root (script directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VENV_DIR="venv"
REQUIREMENTS_FILE="requirements_api.txt"
APP_FILE="face_api_service.py"
HOST="0.0.0.0"
PORT="${PORT:-5001}"  # Default 5001 (port 5000 thường bị AirPlay chiếm trên macOS)

# Prefer a Python version compatible with dlib/face-recognition (3.10/3.11)
PY_CMD_ENV=${PY_CMD:-}

detect_python() {
  if [[ -n "$PY_CMD_ENV" ]] && command -v "$PY_CMD_ENV" >/dev/null 2>&1; then
    PY_CMD="$PY_CMD_ENV"
  elif command -v python3.10 >/dev/null 2>&1; then
    PY_CMD="python3.10"
  elif command -v python3.11 >/dev/null 2>&1; then
    PY_CMD="python3.11"
  else
    PY_CMD="python3"
  fi
  echo "[INFO] Using Python command: $PY_CMD"
}

create_venv() {
  echo "[INFO] Creating virtual environment in $VENV_DIR ..."
  "$PY_CMD" -m venv "$VENV_DIR"
}

activate_venv() {
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
  echo "[INFO] Virtual environment activated: $(python --version)"
  # Warn if Python >= 3.12 which often breaks dlib/numpy builds
  PY_MAJOR=$(python -c 'import sys; print(sys.version_info[0])')
  PY_MINOR=$(python -c 'import sys; print(sys.version_info[1])')
  if [[ "$PY_MAJOR" -eq 3 && "$PY_MINOR" -ge 12 ]]; then
    echo "[WARN] Detected Python ${PY_MAJOR}.${PY_MINOR}. dlib/face-recognition may fail to build on 3.12+."
    echo "[WARN] Recommended: install Python 3.10 (via pyenv) and re-run: PY_CMD=python3.10 ./start_python_service.sh"
  fi
}

install_dependencies() {
  echo "[INFO] Installing dependencies from $REQUIREMENTS_FILE ..."
  pip install --upgrade pip setuptools wheel
  pip install -r "$REQUIREMENTS_FILE"
}

check_venv() {
  if [[ ! -d "$VENV_DIR" ]]; then
    create_venv
    activate_venv
    install_dependencies
  else
    activate_venv
    if [[ "$REQUIREMENTS_FILE" -nt "$VENV_DIR" ]]; then
      echo "[INFO] Requirements updated; reinstalling"
      install_dependencies
    fi
  fi
}

start_service() {
  echo "[INFO] Starting Flask Face Recognition API on $HOST:$PORT ..."

  # ---- Face API runtime config (đồng bộ với Spring/UI) ----
  export FACE_REGISTER_BLOCK_MASK="${FACE_REGISTER_BLOCK_MASK:-1}"
  export FACE_MASK_SCORE_THRESHOLD="${FACE_MASK_SCORE_THRESHOLD:-0.65}"
  export FACE_MASK_DEBUG="${FACE_MASK_DEBUG:-1}"
  export FACE_MASK_FAIL_CLOSED="${FACE_MASK_FAIL_CLOSED:-0}"
  export FACE_MIN_FACE_SIZE="${FACE_MIN_FACE_SIZE:-90}"

  # Slightly lower recognition thresholds to reduce false negatives
  export FACE_THRESHOLD="${FACE_THRESHOLD:-0.60}"
  export FACE_MIN_GAP="${FACE_MIN_GAP:-0.12}"
  
  # Enable NN fallback for low SVM confidence
  export FACE_FALLBACK_ENABLED="${FACE_FALLBACK_ENABLED:-1}"
  export FACE_FALLBACK_DISTANCE_THRESHOLD="${FACE_FALLBACK_DISTANCE_THRESHOLD:-0.58}"
  export FACE_FALLBACK_SECOND_GAP="${FACE_FALLBACK_SECOND_GAP:-0.02}"
  
  # Duplicate face detection (same face for different employees)
  export FACE_DUPLICATE_CHECK_ENABLED="${FACE_DUPLICATE_CHECK_ENABLED:-1}"
  export FACE_DUPLICATE_DISTANCE_THRESHOLD="${FACE_DUPLICATE_DISTANCE_THRESHOLD:-0.55}"
  
  export FACE_MODEL_VERSION="${FACE_MODEL_VERSION:-v1.0}"
  export PORT="$PORT"

  export FLASK_ENV=production
  export PYTHONUNBUFFERED=1

  echo "[INFO] FACE_THRESHOLD=$FACE_THRESHOLD"
  echo "[INFO] FACE_MIN_GAP=$FACE_MIN_GAP"
  echo "[INFO] FACE_MODEL_VERSION=$FACE_MODEL_VERSION"
  echo "[INFO] FACE_REGISTER_BLOCK_MASK=$FACE_REGISTER_BLOCK_MASK"
  echo "[INFO] FACE_MASK_SCORE_THRESHOLD=$FACE_MASK_SCORE_THRESHOLD"
  echo "[INFO] FACE_MASK_DEBUG=$FACE_MASK_DEBUG"
  echo "[INFO] FACE_MASK_FAIL_CLOSED=$FACE_MASK_FAIL_CLOSED"
  echo "[INFO] FACE_MIN_FACE_SIZE=$FACE_MIN_FACE_SIZE"
  echo "[INFO] FACE_FALLBACK_ENABLED=$FACE_FALLBACK_ENABLED"
  echo "[INFO] FACE_FALLBACK_DISTANCE_THRESHOLD=$FACE_FALLBACK_DISTANCE_THRESHOLD"
  echo "[INFO] FACE_FALLBACK_SECOND_GAP=$FACE_FALLBACK_SECOND_GAP"
  echo "[INFO] FACE_DUPLICATE_CHECK_ENABLED=$FACE_DUPLICATE_CHECK_ENABLED"
  echo "[INFO] FACE_DUPLICATE_DISTANCE_THRESHOLD=$FACE_DUPLICATE_DISTANCE_THRESHOLD"

  python "$APP_FILE"
}


main() {
  echo "=============================="
  echo " Face Recognition API Starter "
  echo "=============================="
  detect_python
  check_venv
  start_service
}

main "$@"