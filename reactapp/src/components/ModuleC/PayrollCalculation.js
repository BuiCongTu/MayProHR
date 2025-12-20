import axios from 'axios';
import { useEffect, useState } from 'react';
import './PayrollCalculation.css';

const PayrollCalculation = () =>
{
  const [formData, setFormData] = useState({
    userId: '',
    yearMonth: new Date().toISOString().slice(0, 7),
  });

  const [payrollResult, setPayrollResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [calculationHistory, setCalculationHistory] = useState([]);

  const API_BASE = 'http://localhost:8080/api/v1/payroll';

  // Xử lý thay đổi input
  const handleInputChange = (e) =>
  {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Preview tính lương (không lưu)
  const handlePreview = async (e) =>
  {
    e.preventDefault();
    if (!formData.userId)
    {
      setError('Vui lòng chọn nhân viên');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewMode(true);

    try
    {
      const response = await axios.get(`${API_BASE}/preview`, {
        params: {
          userId: formData.userId,
          yearMonth: formData.yearMonth,
        },
      });

      if (response.data.success)
      {
        setPayrollResult(response.data.data);
      } else
      {
        setError(response.data.message);
      }
    } catch (err)
    {
      setError(err.response?.data?.message || 'Lỗi kết nối API');
    } finally
    {
      setLoading(false);
    }
  };

  // Tính lương và lưu
  const handleCalculateAndSave = async (e) =>
  {
    e.preventDefault();
    if (!formData.userId)
    {
      setError('Vui lòng chọn nhân viên');
      return;
    }

    setLoading(true);
    setError(null);
    setPreviewMode(false);

    try
    {
      const response = await axios.post(`${API_BASE}/calculate`, null, {
        params: {
          userId: formData.userId,
          yearMonth: formData.yearMonth,
        },
      });

      if (response.data.success)
      {
        setPayrollResult(response.data.data);
        alert('Tính lương thành công và lưu vào database');
        // Refresh lịch sử
        fetchPayrollHistory();
      } else
      {
        setError(response.data.message);
      }
    } catch (err)
    {
      setError(err.response?.data?.message || 'Lỗi kết nối API');
    } finally
    {
      setLoading(false);
    }
  };

  // Lấy lịch sử tính lương
  const fetchPayrollHistory = async () =>
  {
    if (!formData.userId) return;

    try
    {
      const response = await axios.get(`${API_BASE}/${formData.userId}/history`);
      if (response.data.success)
      {
        setCalculationHistory(response.data.data);
      }
    } catch (err)
    {
      console.error('Lỗi lấy lịch sử:', err);
    }
  };

  // Load history khi thay đổi userId
  useEffect(() =>
  {
    if (formData.userId)
    {
      fetchPayrollHistory();
    }
  }, [formData.userId]);

  return (
    <div className="payroll-container">
      <h1>⚙️ Tính Lương Nhân Viên (TimeBased)</h1>

      {/* Form Input */}
      <div className="form-section">
        <form>
          <div className="form-group">
            <label>Nhân Viên:</label>
            <input
              type="number"
              name="userId"
              value={formData.userId}
              onChange={handleInputChange}
              placeholder="Nhập ID nhân viên"
              required
            />
          </div>

          <div className="form-group">
            <label>Tháng Tính Lương:</label>
            <input
              type="month"
              name="yearMonth"
              value={formData.yearMonth}
              onChange={handleInputChange}
            />
          </div>

          <div className="button-group">
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="btn-preview"
            >
              👁️ Xem Trước (Preview)
            </button>
            <button
              type="button"
              onClick={handleCalculateAndSave}
              disabled={loading}
              className="btn-save"
            >
              💾 Tính & Lưu
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <div className="alert alert-info">⏳ Đang xử lý...</div>}

      {/* Payroll Result */}
      {payrollResult && (
        <div className="result-section">
          <h2>{previewMode ? '📋 Xem Trước Kết Quả' : '✅ Kết Quả Tính Lương'}</h2>

          <div className="result-grid">
            {/* Thông tin nhân viên */}
            <div className="result-card">
              <h3>👤 Thông Tin Nhân Viên</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Mã NV:</td>
                    <td>{payrollResult.userId}</td>
                  </tr>
                  <tr>
                    <td>Tên:</td>
                    <td>{payrollResult.userName}</td>
                  </tr>
                  <tr>
                    <td>Điện Thoại:</td>
                    <td>{payrollResult.phone}</td>
                  </tr>
                  <tr>
                    <td>Lương Cơ Bản:</td>
                    <td className="amount">{Number(payrollResult.baseSalary).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Ngày công */}
            <div className="result-card">
              <h3>📅 Ngày Công</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Ngày Công Chuẩn:</td>
                    <td>{payrollResult.standardWorkingDays}</td>
                  </tr>
                  <tr>
                    <td>Ngày Phép Được Duyệt:</td>
                    <td>{payrollResult.approvedLeaveDays}</td>
                  </tr>
                  <tr>
                    <td>Ngày Phép Vượt:</td>
                    <td>{payrollResult.excessLeaveDays}</td>
                  </tr>
                  <tr>
                    <td>Ngày Công Tính Lương:</td>
                    <td className="highlight">{payrollResult.workingDaysForPayroll}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Lương & Tăng Ca */}
            <div className="result-card">
              <h3>💰 Lương & Tăng Ca</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Lương Ngày:</td>
                    <td className="amount">{Number(payrollResult.dailySalary).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Lương Thời Gian:</td>
                    <td className="amount">{Number(payrollResult.timeSalary).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Lương/Giờ:</td>
                    <td className="amount">{Number(payrollResult.hourlyRate).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>OT Ngày Thường:</td>
                    <td className="amount">{Number(payrollResult.overtimeWeekday).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>OT Ngày Lễ:</td>
                    <td className="amount">{Number(payrollResult.overtimeHoliday).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Tổng Tiền OT:</td>
                    <td className="amount highlight">{Number(payrollResult.totalOvertimePay).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Phạt & Khấu Trừ */}
            <div className="result-card">
              <h3>⚠️ Phạt & Khấu Trừ</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Số Lần Đi Trễ:</td>
                    <td>{payrollResult.lateCount}</td>
                  </tr>
                  <tr>
                    <td>Phạt Đi Trễ:</td>
                    <td className="amount negative">{Number(payrollResult.latePenalty).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Bảo Hiểm (10.5%):</td>
                    <td className="amount negative">{Number(payrollResult.insurance).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Thuế */}
            <div className="result-card">
              <h3>🏛️ Thuế TNCN</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Thu Nhập Chịu Thuế:</td>
                    <td className="amount">{Number(payrollResult.incomeForTax).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Thuế TNCN:</td>
                    <td className="amount negative">{Number(payrollResult.incomeTax).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tổng */}
            <div className="result-card result-total">
              <h3>📊 Tổng Kết</h3>
              <table>
                <tbody>
                  <tr>
                    <td>Phụ Cấp:</td>
                    <td className="amount">{Number(payrollResult.allowance).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr>
                    <td>Tổng Thu Nhập:</td>
                    <td className="amount highlight">{Number(payrollResult.totalIncome).toLocaleString('vi-VN')} ₫</td>
                  </tr>
                  <tr className="final-row">
                    <td><strong>Lương Thực Nhận:</strong></td>
                    <td className="amount highlight final"><strong>{Number(payrollResult.netSalary).toLocaleString('vi-VN')} ₫</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Chi tiết tính toán */}
          <div className="calculation-note">
            <h3>📝 Chi Tiết Tính Toán (22 Bước)</h3>
            <pre>{payrollResult.calculationNote}</pre>
          </div>
        </div>
      )}

      {/* Payroll History */}
      {calculationHistory.length > 0 && (
        <div className="history-section">
          <h2>📜 Lịch Sử Tính Lương</h2>
          <table className="history-table">
            <thead>
              <tr>
                <th>Tháng</th>
                <th>Lương Cơ Bản</th>
                <th>Tăng Ca</th>
                <th>Phạt</th>
                <th>Bảo Hiểm</th>
                <th>Thuế</th>
                <th>Lương Ròng</th>
                <th>Ngày Tính</th>
              </tr>
            </thead>
            <tbody>
              {calculationHistory.map((payroll) => (
                <tr key={payroll.id}>
                  <td>{payroll.yearMonth}</td>
                  <td className="amount">{Number(payroll.baseSalary).toLocaleString('vi-VN')}</td>
                  <td className="amount">{Number(payroll.overtimePay).toLocaleString('vi-VN')}</td>
                  <td className="amount negative">{Number(payroll.latePenalty).toLocaleString('vi-VN')}</td>
                  <td className="amount negative">{Number(payroll.insurance).toLocaleString('vi-VN')}</td>
                  <td className="amount negative">{Number(payroll.incomeTax).toLocaleString('vi-VN')}</td>
                  <td className="amount highlight">{Number(payroll.netSalary).toLocaleString('vi-VN')}</td>
                  <td>{payroll.calculationDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayrollCalculation;
