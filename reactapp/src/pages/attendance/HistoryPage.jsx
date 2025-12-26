import { useEffect, useState } from 'react';
import attendanceService from '../../services/moduleA/attendanceService';

const HistoryPage = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    if (currentUser?.userId) fetchAttendance(currentUser.userId, selectedDate);
  }, [currentUser, selectedDate]);

  const fetchAttendance = async (userId, date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await attendanceService.getHistory(userId, date);
      const attendances = data.attendances || [];
      setAttendanceData(attendances.map(a => ({...a, workingHours: parseFloat(a.workingHours || 0)})));
    } catch (err) {
      setError('Can not fetch attendance data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => setSelectedDate(e.target.value);
  const formatWorkingHours = (hours) => {
    const h = Math.floor(hours); const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };
  const getStatusBadge = (status) => {
    const styles = { SUCCESS:{bg:'#e8f5e9', color:'#4CAF50', text:'✓ On Time'}, LATE:{bg:'#fff3cd', color:'#ff9800', text:'⚠ Late'}, ABSENT:{bg:'#ffebee', color:'#f44336', text:'✗ Absent'} };
    const s = styles[status] || {bg:'#e3f2fd', color:'#2196F3', text:'◐ Not set'};
    return <span style={{backgroundColor:s.bg,color:s.color,padding:'5px 12px',borderRadius:'15px',fontSize:'14px',fontWeight:'bold'}}>{s.text}</span>;
  };
  const calculateTotalHours = () => attendanceData.reduce((t,r)=>t+(r.workingHours||0),0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Attendance History</h1>
        <p style={styles.subtitle}>View your check-in/check-out history</p>
      </div>

      <div style={styles.controlsBar}>
        <div>
          <label style={styles.label}>📅 Select Date:</label>
          <input type="date" value={selectedDate} onChange={handleDateChange} style={styles.dateInput} />
        </div>
      </div>

      {loading && <div style={styles.loadingContainer}><div style={styles.spinner}></div><p>Loading data...</p></div>}
      {error && <div style={styles.errorBox}><h3>❌ Error</h3><p>{error}</p><button onClick={()=>fetchAttendance(currentUser.userId, selectedDate)} style={styles.retryButton}>Retry</button></div>}

      {!loading && !error && attendanceData.length>0 && (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Date</th><th>Time In</th><th>Time Out</th><th>Total Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((r,i)=>(
                <tr key={i}>
                  <td>{new Date(r.date).toLocaleDateString('vi-VN')}</td>
                  <td>{r.timeIn?new Date(r.timeIn).toLocaleTimeString('vi-VN'):'-'}</td>
                  <td>{r.timeOut?new Date(r.timeOut).toLocaleTimeString('vi-VN'):'-'}</td>
                  <td>{formatWorkingHours(r.workingHours)}</td>
                  <td>{getStatusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && attendanceData.length===0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <h3>No data</h3>
          <p>No attendance records for this date.</p>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  title: {
    fontSize: '36px',
    color: '#333',
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '10px',
  },
  datePickerContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  label: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  dateInput: {
    padding: '10px 15px',
    fontSize: '16px',
    border: '2px solid #ddd',
    borderRadius: '5px',
    outline: 'none',
  },
  viewSelector: {
    display: 'flex',
    gap: '10px',
  },
  viewButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#e0e0e0',
    color: '#666',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  activeViewButton: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  summaryCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  summaryCard: {
    backgroundColor: 'white',
    padding: '25px',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  cardIcon: {
    fontSize: '48px',
  },
  cardContent: {
    flex: 1,
  },
  cardLabel: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '5px',
  },
  cardValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
  },
  tableContainer: {
    backgroundColor: 'white',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
  },
  td: {
    padding: '15px',
    fontSize: '15px',
    color: '#333',
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '50px',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    border: '2px solid #f44336',
    borderRadius: '10px',
    padding: '30px',
    textAlign: 'center',
    marginTop: '20px',
  },
  retryButton: {
    marginTop: '20px',
    padding: '10px 30px',
    fontSize: '16px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '10px',
  },
  emptyIcon: {
    fontSize: '72px',
    marginBottom: '20px',
  },
  exportContainer: {
    marginTop: '30px',
    display: 'flex',
    gap: '15px',
    justifyContent: 'center',
  },
  exportButton: {
    padding: '12px 30px',
    fontSize: '16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  printButton: {
    padding: '12px 30px',
    fontSize: '16px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

// Add spinner animation
const spinnerAnimation = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = spinnerAnimation;
  document.head.appendChild(styleSheet);
}

export default HistoryPage;
