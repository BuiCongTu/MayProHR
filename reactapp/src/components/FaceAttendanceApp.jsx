import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FaceAttendanceApp.css';

const FaceAttendanceApp = () => {
  const [currentMenu, setCurrentMenu] = useState('main');
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  
  // Form states
  const [registerForm, setRegisterForm] = useState({
    student_id: '',
    student_name: '',
    email: '',
    file: null
  });
  
  const [attendanceForm, setAttendanceForm] = useState({
    file: null
  });
  
  const [incrementalForm, setIncrementalForm] = useState({
    file: null
  });

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

  // Load students and attendance on mount
  useEffect(() => {
    loadStudents();
    loadAttendance();
  }, []);

  const showMessage = (msg, type = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const loadStudents = async () => {
    try {
      const response = await axios.get(`${API_URL}/students`);
      setStudents(response.data);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await axios.get(`${API_URL}/attendance-logs`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  // 1. Register Student
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerForm.file) {
      showMessage('Vui lòng chọn ảnh', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('student_id', registerForm.student_id);
      formData.append('student_name', registerForm.student_name);
      formData.append('email', registerForm.email);
      formData.append('file', registerForm.file);

      const response = await axios.post(`${API_URL}/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showMessage(`${registerForm.student_name} đã được đăng ký thành công!`, 'success');
      setRegisterForm({ student_id: '', student_name: '', email: '', file: null });
      loadStudents();
      setCurrentMenu('main');
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Train Models
  const handleTrainModels = async () => {
    if (students.length === 0) {
      showMessage('Vui lòng đăng ký ít nhất 1 sinh viên trước', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/train`);
      showMessage(`Model đã được train thành công! Độ chính xác: ${response.data.accuracy?.toFixed(2)}%`, 'success');
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Train Incremental
  const handleTrainIncremental = async (e) => {
    e.preventDefault();
    if (!incrementalForm.file) {
      showMessage('Vui lòng chọn ảnh', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', incrementalForm.file);

      const response = await axios.post(`${API_URL}/train-incremental`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showMessage('Model đã được cập nhật thành công!', 'success');
      setIncrementalForm({ file: null });
      setCurrentMenu('main');
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. Attendance Check
  const handleAttendance = async (e) => {
    e.preventDefault();
    if (!attendanceForm.file) {
      showMessage('Vui lòng chọn ảnh', 'error');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', attendanceForm.file);

      const response = await axios.post(`${API_URL}/attendance`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const data = response.data;
      if (data.recognized) {
        showMessage(
          `Điểm danh thành công! ${data.student_name} - Độ tin cậy: ${data.confidence?.toFixed(2)}%`,
          'success'
        );
      } else {
        showMessage('Không nhận diện được người trong ảnh', 'warning');
      }
      setAttendanceForm({ file: null });
      loadAttendance();
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Benchmark
  const handleBenchmark = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/benchmark`);
      const data = response.data;
      showMessage(
        `Benchmark: Precision=${data.precision?.toFixed(2)}%, Recall=${data.recall?.toFixed(2)}%, F1=${data.f1?.toFixed(2)}%`,
        'success'
      );
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 8. Delete All Attendance
  const handleDeleteAttendance = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa tất cả điểm danh?')) return;

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/attendance-logs`);
      showMessage('Đã xóa tất cả điểm danh', 'success');
      loadAttendance();
      setCurrentMenu('main');
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 9. Delete Student
  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Bạn có chắc muốn xóa sinh viên này?')) return;

    setLoading(true);
    try {
      await axios.delete(`${API_URL}/students/${studentId}`);
      showMessage('Đã xóa sinh viên', 'success');
      loadStudents();
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // 10. Reset System
  const handleResetSystem = async () => {
    if (!window.confirm('CẢNH BÁO: Thao tác này sẽ xóa TẤT CẢ dữ liệu!')) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/reset`);
      showMessage('Hệ thống đã được reset', 'success');
      setStudents([]);
      setAttendance([]);
      setCurrentMenu('main');
    } catch (error) {
      showMessage(`Lỗi: ${error.response?.data?.detail || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="face-app">
      <header className="header">
        <h1>Face Attendance System</h1>
        <p>Hệ thống điểm danh sinh viên bằng nhận diện khuôn mặt</p>
      </header>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
          <button onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="container">
        {currentMenu === 'main' && (
          <div className="menu">
            <div className="menu-grid">
              <button className="menu-btn" onClick={() => setCurrentMenu('register')} disabled={loading}>
                Đăng ký sinh viên
              </button>
              <button className="menu-btn" onClick={handleTrainModels} disabled={loading}>
                Train Model
              </button>
              <button className="menu-btn" onClick={() => setCurrentMenu('incremental')} disabled={loading}>
                ➕ Train Incremental
              </button>
              <button className="menu-btn" onClick={() => setCurrentMenu('attendance')} disabled={loading}>
                Điểm danh
              </button>
              <button className="menu-btn" onClick={handleBenchmark} disabled={loading}>
                Benchmark
              </button>
              <button className="menu-btn" onClick={() => setCurrentMenu('attendance-logs')} disabled={loading}>
                Xem điểm danh
              </button>
              <button className="menu-btn" onClick={() => setCurrentMenu('students')} disabled={loading}>
                Xem sinh viên
              </button>
              <button className="menu-btn danger" onClick={handleDeleteAttendance} disabled={loading}>
                Xóa điểm danh
              </button>
              <button className="menu-btn danger" onClick={() => setCurrentMenu('delete-student')} disabled={loading}>
                Xóa sinh viên
              </button>
              <button className="menu-btn danger" onClick={handleResetSystem} disabled={loading}>
                Reset hệ thống
              </button>
            </div>
          </div>
        )}

        {currentMenu === 'register' && (
          <div className="form-container">
            <h2>Đăng ký sinh viên mới</h2>
            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Mã sinh viên"
                value={registerForm.student_id}
                onChange={(e) => setRegisterForm({ ...registerForm, student_id: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Tên sinh viên"
                value={registerForm.student_name}
                onChange={(e) => setRegisterForm({ ...registerForm, student_name: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email (tuỳ chọn)"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setRegisterForm({ ...registerForm, file: e.target.files[0] })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </button>
            </form>
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {currentMenu === 'incremental' && (
          <div className="form-container">
            <h2>➕ Train Incremental</h2>
            <form onSubmit={handleTrainIncremental}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setIncrementalForm({ file: e.target.files[0] })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Train'}
              </button>
            </form>
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {currentMenu === 'attendance' && (
          <div className="form-container">
            <h2>Điểm danh</h2>
            <form onSubmit={handleAttendance}>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAttendanceForm({ file: e.target.files[0] })}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Điểm danh'}
              </button>
            </form>
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {currentMenu === 'students' && (
          <div className="table-container">
            <h2>Danh sách sinh viên ({students.length})</h2>
            {students.length === 0 ? (
              <p className="empty">Chưa có sinh viên nào được đăng ký</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Ngày đăng ký</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.student_id}</td>
                      <td>{student.name}</td>
                      <td>{student.email || '-'}</td>
                      <td>{new Date(student.created_at).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={loading}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {currentMenu === 'attendance-logs' && (
          <div className="table-container">
            <h2>📋 Lịch điểm danh ({attendance.length})</h2>
            {attendance.length === 0 ? (
              <p className="empty">Chưa có bản ghi điểm danh nào</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Sinh viên</th>
                    <th>Thời gian</th>
                    <th>Độ tin cậy (%)</th>
                    <th>Phiên</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((log, idx) => (
                    <tr key={idx}>
                      <td>{log.student_name}</td>
                      <td>{new Date(log.timestamp).toLocaleString('vi-VN')}</td>
                      <td>{log.confidence?.toFixed(2)}%</td>
                      <td>{log.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {currentMenu === 'delete-student' && (
          <div className="table-container">
            <h2>Xóa sinh viên</h2>
            {students.length === 0 ? (
              <p className="empty">Chưa có sinh viên nào</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.student_id}</td>
                      <td>{student.name}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteStudent(student.id)}
                          disabled={loading}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button className="back-btn" onClick={() => setCurrentMenu('main')}>← Quay lại</button>
          </div>
        )}

        {loading && <div className="loading">Đang xử lý...</div>}
      </div>
    </div>
  );
};

export default FaceAttendanceApp;
