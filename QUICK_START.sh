echo "Step 1: Check Python Face API..."
              if curl -s http://localhost:5001/health > /dev/null 2>&1; then
                  echo "Python Face API is running (port 5001)"
              else
                  echo "Python Face API is not running"
                  echo "   Open a new terminal and run:"
                  echo "  - On macOS:
                            cd face_attendant_svm
                            python3 -m venv venv
                            source venv/bin/activate
                            pip install -r requirements_api.txt
                            bash startPythonApi.sh"
                  echo "  - On Windows:
                            cd face_attendant_svm
                            python -m venv venv
                            venv\\Scripts\\activate
                            pip install -r requirements_api.txt
                            bash startPythonApi.sh"
                  echo ""
                  read -p "Press Enter after the Python service has started..."
              fi

              # Start Spring Boot
              echo ""
              echo " Step 2: Start Spring Boot backend..."
              echo "   Port: 9999"
              echo "   Compiling and running..."
              (cd "$ROOT_DIR/springbootapp" && ./mvnw spring-boot:run > /dev/null 2>&1 &)
              SPRING_PID=$!
              echo "   PID: $SPRING_PID"
              echo "   Waiting 15 seconds for Spring Boot to start..."
              sleep 15

              # Check Spring Boot
              if curl -s http://localhost:9999/actuator/health > /dev/null 2>&1; then
                  echo "Spring Boot is running"
              else
                  echo " Spring Boot may still be starting, check logs if needed"
              fi

              # Start React
              echo ""
              echo " Step 3: Start React frontend..."
              echo "   Port: 3000"
              (cd "$ROOT_DIR/reactapp" && npm start > /dev/null 2>&1 &)
              REACT_PID=$!
              echo "   PID: $REACT_PID"
              echo "   Waiting 10 seconds for React dev server to start..."
              sleep 10

              echo ""
              echo "=================================================="
              echo "ALL SERVICES HAVE STARTED"
              echo "=================================================="
              echo ""
              echo "Python Face API:    http://localhost:5001"
              echo " Spring Boot API:    http://localhost:9999"
              echo " React Frontend:     http://localhost:3000"
              echo ""
              echo "React pages:"
              echo "   - Check-In:         http://localhost:3000/attendance/checkin"
              echo "   - Check-Out:        http://localhost:3000/attendance/checkout"
              echo "   - Register face:    http://localhost:3000/attendance/register"
              echo "   - History:          http://localhost:3000/attendance/history"
              echo ""
              echo "Test APIs:"
              echo "   curl http://localhost:5001/health"
              echo "   curl http://localhost:9999/actuator/health"
              echo ""
              echo " Stop services:"
              echo "   kill $SPRING_PID $REACT_PID"
              echo "   (Python service: Ctrl+C in the terminal where it's running)"
              echo ""
              echo "=================================================="