import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table, Badge } from 'react-bootstrap';
import { getAllDepartments } from '../../services/departmentService';
import { getUsersByStructure } from '../../services/userService';
import attendanceService from '../../services/moduleA/attendanceService';

const AttendanceReportPage = () =>
{
    const [mode, setMode] = useState('MONTH'); // DAY | MONTH | YEAR

    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

    const [filterDeptId, setFilterDeptId] = useState('');
    const [filterUserId, setFilterUserId] = useState('');

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentYearStr = String(new Date().getFullYear());

    const [filterDate, setFilterDate] = useState(todayStr);
    const [filterMonth, setFilterMonth] = useState(currentMonthStr);
    const [filterYear, setFilterYear] = useState(currentYearStr);

    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    useEffect(() =>
    {
        const loadDepartments = async () =>
        {
            try
            {
                setDepartmentsLoading(true);
                const res = await getAllDepartments();
                const data = res?.data || res || [];
                setDepartments(Array.isArray(data) ? data : []);
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
                setError('');
                const data = await getUsersByStructure({ departmentId: parseInt(filterDeptId, 10) });
                setUsers(Array.isArray(data) ? data : []);
            } catch (err)
            {
                setError('Failed to load employees: ' + (err?.message || 'Unknown error'));
                setUsers([]);
            } finally
            {
                setUsersLoading(false);
            }
        };
        loadUsers();
    }, [filterDeptId]);

    const calculateWorkingHours = (timeIn, timeOut) =>
    {
        if (!timeIn || !timeOut) return '-';

        const [hIn, mIn] = timeIn.split(':').map(Number);
        const [hOut, mOut] = timeOut.split(':').map(Number);

        const minutesIn = hIn * 60 + mIn;
        const minutesOut = hOut * 60 + mOut;

        const diffMinutes = minutesOut - minutesIn;
        if (diffMinutes < 0) return '-';

        const hours = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;

        return `${hours}h ${minutes}m`;
    };

    const getStatusVariant = (status) =>
    {
        switch ((status || '').toUpperCase())
        {
            case 'SUCCESS': return 'success';
            case 'LATE': return 'warning';
            case 'MANUAL': return 'info';
            case 'ERROR': return 'danger';
            default: return 'secondary';
        }
    };

    const title = useMemo(() =>
    {
        if (mode === 'DAY') return `Attendance theo ngày: ${filterDate}`;
        if (mode === 'YEAR') return `Attendance theo năm: ${filterYear}`;
        return `Attendance theo tháng: ${filterMonth}`;
    }, [mode, filterDate, filterMonth, filterYear]);

    const loadAttendance = async () =>
    {
        try
        {
            setLoading(true);
            setError('');
            setInfo('');

            const userId = filterUserId ? parseInt(filterUserId, 10) : null;

            let data = [];
            if (mode === 'DAY')
            {
                if (!filterDate) throw new Error('Vui lòng chọn ngày');
                data = await attendanceService.getByDate(filterDate, userId);
            }
            else if (mode === 'YEAR')
            {
                if (!filterYear) throw new Error('Vui lòng nhập năm');
                const startDate = `${filterYear}-01-01`;
                const endDate = `${filterYear}-12-31`;
                data = await attendanceService.getByRange(startDate, endDate, userId);
            }
            else
            {
                if (!filterMonth) throw new Error('Vui lòng chọn tháng');
                const monthFormatted = filterMonth.length === 7 ? filterMonth : filterMonth.slice(0, 7);
                data = await attendanceService.getByMonth(monthFormatted, userId);
            }

            // Filter thêm theo department ở FE (vì API hiện chỉ filter userId)
            const deptIdNum = filterDeptId ? parseInt(filterDeptId, 10) : null;
            const filtered = deptIdNum
                ? data.filter(a => Number(a.departmentId) === deptIdNum || String(a.departmentId) === String(deptIdNum))
                : data;

            setAttendances(filtered);

            if (!filtered || filtered.length === 0)
            {
                setInfo('Không có bản ghi attendance phù hợp.');
            }
        } catch (err)
        {
            const msg = err?.response?.data?.message || err?.message || 'Failed to load attendance';
            setError(msg);
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

    return (
        <div className="p-4">
            <h2 className="mb-3">Attendance Report</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                    {info && <Alert variant="info" onClose={() => setInfo('')} dismissible>{info}</Alert>}
                </div>
            )}

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="gy-3 align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Chế độ</Form.Label>
                                    <Form.Select value={mode} onChange={(e) => setMode(e.target.value)}>
                                        <option value="DAY">Theo ngày</option>
                                        <option value="MONTH">Theo tháng</option>
                                        <option value="YEAR">Theo năm</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Thời gian</Form.Label>
                                    {mode === 'DAY' && (
                                        <Form.Control type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                                    )}
                                    {mode === 'MONTH' && (
                                        <Form.Control type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
                                    )}
                                    {mode === 'YEAR' && (
                                        <Form.Control
                                            type="number"
                                            min="2000"
                                            max="2100"
                                            value={filterYear}
                                            onChange={(e) => setFilterYear(e.target.value)}
                                            placeholder="YYYY"
                                        />
                                    )}
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

                            <Col md={2}>
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

                            <Col md={1}>
                                <Button type="submit" variant="primary" className="w-100">
                                    Search
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold">{title}</div>
                        <div className="text-muted small">Total: {attendances.length}</div>
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : attendances.length === 0 ? (
                        <div className="alert alert-info m-3">No attendance records found.</div>
                    ) : (
                        <Table striped bordered hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>Date</th>
                                <th>Department</th>
                                <th>Employee</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Working Hours</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {attendances.map((att, idx) => (
                                <tr key={att.id ?? idx}>
                                    <td>{att.date || '-'}</td>
                                    <td>{att.departmentName || '-'}</td>
                                    <td>{att.userName || '-'}</td>
                                    <td>{att.timeIn ? String(att.timeIn).substring(0, 5) : '-'}</td>
                                    <td>{att.timeOut ? String(att.timeOut).substring(0, 5) : '-'}</td>
                                    <td>{calculateWorkingHours(att.timeIn, att.timeOut)}</td>
                                    <td>
                                        <Badge bg={getStatusVariant(att.status)}>
                                            {att.status || 'UNKNOWN'}
                                        </Badge>
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

export default AttendanceReportPage;