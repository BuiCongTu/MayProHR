#!/usr/bin/env bash
set -euo pipefail

# Determine project root (script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"   # adjust to "$SCRIPT_DIR/.." if script is inside a subfolder

# Quick checks
if [ ! -d "$ROOT_DIR/springbootapp" ]; then
  echo "ERROR: directory \`$ROOT_DIR/springbootapp\` not found. Set \`ROOT_DIR\` or run script from project root."
  exit 1
fi
if [ ! -d "$ROOT_DIR/reactapp" ]; then
  echo "ERROR: directory \`$ROOT_DIR/reactapp\` not found. Set \`ROOT_DIR\` or run script from project root."
  exit 1
fi

# Start Spring Boot (capture actual PID)
echo " Step 2: Start Spring Boot backend..."
cd "$ROOT_DIR/springbootapp"
nohup ./mvnw spring-boot:run > /dev/null 2>&1 &
SPRING_PID=$!
echo "   PID: $SPRING_PID"
echo "   Waiting 15 seconds for Spring Boot to start..."
sleep 15

# Start React (capture actual PID)
echo " Step 3: Start React frontend..."
cd "$ROOT_DIR/reactapp"
nohup npm start > /dev/null 2>&1 &
REACT_PID=$!
echo "   PID: $REACT_PID"
echo "   Waiting 10 seconds for React dev server to start..."
sleep 10

# Continue with health checks / prints...
