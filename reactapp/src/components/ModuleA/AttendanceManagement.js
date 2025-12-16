import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { getAllDepartments } from '../../services/departmentService';
import attendanceService from '../../services/moduleA/attendanceService';
import { getUsersByStructure } from '../../services/userService';
import '../../styles/payroll.css';

const AttendanceManagement = () =>
{
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [filterDeptId, setFilterDeptId] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Load departments
  useEffect(() =>
  {
    const loadDepartments = async () =>
    {
      try
      {
        setDepartmentsLoading(true);
        const res = await getAllDepartments();
        const data = res?.data || res || [];
        setDepartments(data);
      } catch (err)
      {
        setError(err?.message || 'Failed to load departments');
      } finally
      {
        setDepartmentsLoading(false);
      }
    };
    loadDepartments();
  }, []);

  // Load users when department changes
  useEffect(() =>
  {
    const loadUsers = async () =>
    {
      if (!filterDeptId)
      {
        setUsers([]);
        return;
      }
      try
      {
        setUsersLoading(true);
        const data = await getUsersByStructure({ departmentId: parseInt(filterDeptId) });
        setUsers(Array.isArray(data) ? data : []);
      } catch (err)
      {
        console.error('Error loading users:', err);
        setUsers([]);
      } finally
      {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [filterDeptId]);

  // Load attendance by month
  const loadAttendance = async () =>
  {
    if (!filterMonth)
    {
      setError('Please select a month');
      return;
    }

    try
    {
      setLoading(true);
      setError('');
      setInfo('');

      // If user is selected, fetch specific user's attendance; otherwise all in department or all
      const userId = filterUserId ? parseInt(filterUserId) : null;
      console.log('[AttendanceManagement] Fetching - Month:', filterMonth, 'UserId:', userId);
      const data = await attendanceService.getByMonth(filterMonth, userId);

      console.log('[AttendanceManagement] Attendance data:', data);
      setAttendances(Array.isArray(data) ? data : []);

      if (data.length === 0)
      {
        setInfo(`No attendance records for ${filterMonth}`);
      }
    } catch (err)
    {
      console.error('[AttendanceManagement] Error:', err);
      const errorMsg = err.response?.data?.message || err?.message || 'Failed to load attendance';
      setError(errorMsg);
      setAttendances([]);
    } finally
    {
      setLoading(false);
    }
  };

  const handleSearch = (e) =>
  {
    e.preventDefault();
    loadAttendance();
  };

  const getDeptName = (deptId) =>
  {
    const d = departments.find(dep => dep.id === parseInt(deptId));
    return d?.name || '-';
  };

  const getUserName = (userId) =>
  {
    const u = users.find(usr => usr.id === parseInt(userId));
    return u?.fullName || '-';
  };

  return (
    <div className="payroll-list-container p-4">
      <h2>Attendance Management</h2>

      {(error || info) && (
        <div className="mb-3">
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {info && <Alert variant="info" onClose={() => setInfo('')} dismissible>{info}</Alert>}
        </div>
      )}

      {/* Filter */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="gy-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Month <span style={{ color: 'red' }}>*</span></Form.Label>
                  <Form.Control
                    type="month"
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Department</Form.Label>
                  {departmentsLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Form.Select
                      value={filterDeptId}
                      onChange={e =>
                      {
                        setFilterDeptId(e.target.value);
                        setFilterUserId('');
                      }}
                    >
                      <option value="">All Departments</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Employee</Form.Label>
                  {usersLoading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <Form.Select
                      value={filterUserId}
                      onChange={e => setFilterUserId(e.target.value)}
                      disabled={!filterDeptId}
                    >
                      <option value="">All Employees</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.fullName}</option>
                      ))}
                    </Form.Select>
                  )}
                </Form.Group>
              </Col>
              <Col md={3} className="d-flex align-items-end">
                <Button type="submit" variant="primary" className="w-100">
                  Search
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Result Table */}
      <Card className="shadow-sm">
        <Card.Header className="bg-light">
          <h6 className="mb-0">Attendance Records for {filterMonth}</h6>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
            </div>
          ) : attendances.length === 0 ? (
            <div className="alert alert-info m-3">
              No attendance records found.
            </div>
          ) : (
            <Table striped bordered hover responsive className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Date</th>
                  <th>Department</th>
                  <th>Employee</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendances.map((att, idx) => (
                  <tr key={idx}>
                    <td>{att.date}</td>
                    <td>{att.departmentName || '-'}</td>
                    <td>{att.userName || '-'}</td>
                    <td>{att.timeIn || '-'}</td>
                    <td>{att.timeOut || '-'}</td>
                    <td>
                      <span className={`badge bg-${att.status === 'SUCCESS' ? 'success' : att.status === 'LATE' ? 'warning' : 'danger'}`}>
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default AttendanceManagement;
