import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import { getAllDepartments } from '../../services/departmentService';
import {
    getAllLeaveRequests, getLeaveRequestById, createLeaveRequest,
    updateLeaveRequest, deleteLeaveRequest, getLeaveRequestsByUser,
    getAllLeaveRequestsSimple, getLeaveRequestsByMonth
} from '../../services/moduleA/leaveRequestService';
import { getUsersByStructure } from '../../services/userService';
import '../../styles/payroll.css';

const LeaveRequestManagement = () =>
{
    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);

    const [filterDeptId, setFilterDeptId] = useState('');
    const [filterUserId, setFilterUserId] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({
        userId: '',
        startDate: '',
        endDate: '',
        reason: '',
        status: 'pending'
    });

    const [saving, setSaving] = useState(false);

    const parseDateString = (dateStr) => {
        if (!dateStr) return null;
        // Extract date part only (e.g., "2025-11-28" from "2025-11-28T00:00:00")
        return dateStr.split('T')[0];
    };

    const calculateDays = (startStr, endStr) => {
        if (!startStr || !endStr) return 0;
        const start = new Date(startStr + 'T00:00:00');
        const end = new Date(endStr + 'T00:00:00');
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    };

    // Load departments
    useEffect(() => {
        const loadDepartments = async () => {
            try {
                setDepartmentsLoading(true);
                const res = await getAllDepartments();
                const data = res?.data || res || [];
                setDepartments(data);
            } catch (err) {
                setError(err?.message || 'Failed to load departments');
            } finally {
                setDepartmentsLoading(false);
            }
        };
        loadDepartments();
    }, []);

    // Load users when department changes
    useEffect(() => {
        const loadUsers = async () => {
            if (!filterDeptId) {
                setUsers([]);
                return;
            }
            try {
                setUsersLoading(true);
                const data = await getUsersByStructure({ departmentId: parseInt(filterDeptId) });
                setUsers(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error loading users:', err);
                setUsers([]);
            } finally {
                setUsersLoading(false);
            }
        };
        loadUsers();
    }, [filterDeptId]);

    const loadLeaveRequests = async () => {
        try {
            setLoading(true);
            setError('');
            setInfo('');
            let requests = [];

            if (!filterMonth || !filterDeptId) {
                setError('Please select month and department');
                setLeaveRequests([]);
                setLoading(false);
                return;
            }

            console.log('[LeaveRequestManagement] Load - Month:', filterMonth, 'DeptId:', filterDeptId, 'UserId:', filterUserId);

            // ✅ Gọi BE /by-month với month + departmentId + optional userId
            const data = await getLeaveRequestsByMonth(
                filterMonth,
                parseInt(filterDeptId),
                filterUserId ? parseInt(filterUserId) : null
            );

            requests = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            console.log('[LeaveRequestManagement] /by-month returned:', requests.length, 'records');

            // ✅ Lọc theo status (nếu chọn)
            if (filterStatus) {
                requests = requests.filter(lr =>
                    lr.status?.toLowerCase() === filterStatus.toLowerCase()
                );
                console.log('[LeaveRequestManagement] After status filter:', requests.length, 'records');
            }

            setLeaveRequests(requests);
            if (requests.length === 0) {
                setInfo(`No leave requests found for ${filterMonth}`);
            }
        } catch (err) {
            console.error('[LeaveRequestManagement] Error:', err);
            const errorMsg = err.response?.data?.message || err?.message || 'Failed to load leave requests';
            setError(errorMsg);
            setLeaveRequests([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        loadLeaveRequests();
    };

    const handleOpenModal = (leaveRequest = null) => {
        if (leaveRequest) {
            setEditingId(leaveRequest.id);
            setForm({
                userId: leaveRequest.user?.id || '',
                startDate: parseDateString(leaveRequest.startDate) || '',
                endDate: parseDateString(leaveRequest.endDate) || '',
                reason: leaveRequest.reason || '',
                status: leaveRequest.status?.toLowerCase() || 'pending'
            });
        } else {
            setEditingId(null);
            setForm({
                userId: filterUserId || '',
                startDate: '',
                endDate: '',
                reason: '',
                status: 'pending'
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setForm({ userId: '', startDate: '', endDate: '', reason: '', status: 'pending' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.userId || !form.startDate || !form.endDate) {
            setError('Please fill in all required fields');
            return;
        }

        if (form.startDate > form.endDate) {
            setError('Start date must be before end date');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                user: { id: parseInt(form.userId) },
                startDate: form.startDate,
                endDate: form.endDate,
                reason: form.reason,
                status: form.status
            };

            if (editingId) {
                await updateLeaveRequest(editingId, payload);
                setInfo('Leave request updated successfully');
            } else {
                await createLeaveRequest(payload);
                setInfo('Leave request created successfully');
            }

            handleCloseModal();
            loadLeaveRequests();
        } catch (err) {
            setError(err?.message || 'Failed to save leave request');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this leave request?')) return;

        try {
            await deleteLeaveRequest(id);
            setInfo('Leave request deleted successfully');
            loadLeaveRequests();
        } catch (err) {
            setError(err?.message || 'Failed to delete leave request');
        }
    };

    const getDeptName = (deptId) => {
        const d = departments.find(dep => dep.id === deptId);
        return d?.name || '-';
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Leave Request Management</h2>

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
                                    <Form.Label>Department <span style={{ color: 'red' }}>*</span></Form.Label>
                                    {departmentsLoading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Form.Select
                                            value={filterDeptId}
                                            onChange={e => {
                                                setFilterDeptId(e.target.value);
                                                setFilterUserId('');
                                            }}
                                        >
                                            <option value="">Select Department</option>
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
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                        <option value="">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end gap-2">
                                <Button type="submit" variant="primary" className="flex-grow-1">
                                    Search
                                </Button>
                                <Button variant="success" onClick={() => handleOpenModal()} className="flex-grow-1">
                                    New Request
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Modal edit */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingId ? 'Edit Leave Request' : 'New Leave Request'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row className="gy-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Employee <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Select
                                        value={form.userId}
                                        onChange={e => setForm({ ...form, userId: e.target.value })}
                                        disabled={editingId !== null || !filterDeptId}
                                    >
                                        <option value="">Select Employee</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.fullName}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Start Date <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.startDate}
                                        onChange={e => setForm({ ...form, startDate: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>End Date <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={form.endDate}
                                        onChange={e => setForm({ ...form, endDate: e.target.value })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Reason</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        value={form.reason}
                                        onChange={e => setForm({ ...form, reason: e.target.value })}
                                        placeholder="Enter reason for leave"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Saving...' : (editingId ? 'Update' : 'Create')}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Result Table */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Leave Requests for {filterMonth} ({leaveRequests.length})</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : leaveRequests.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No leave requests found.
                        </div>
                    ) : (
                        <Table striped bordered hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>Employee</th>
                                <th>Department</th>
                                <th>Start Date</th>
                                <th>End Date</th>
                                <th>Days</th>
                                <th>Status</th>
                                <th>Reason</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {leaveRequests.map(lr => {
                                const startDateStr = parseDateString(lr.startDate);
                                const endDateStr = parseDateString(lr.endDate);
                                const days = calculateDays(startDateStr, endDateStr);

                                return (
                                    <tr key={lr.id}>
                                        <td>{lr.userName || lr.user?.fullName || '-'}</td>
                                        <td>{getDeptName(lr.departmentId ?? lr.user?.departmentId)}</td>
                                        <td>{startDateStr || '-'}</td>
                                        <td>{endDateStr || '-'}</td>
                                        <td>{days}</td>
                                        <td>
                        <span className={`badge bg-${
                            lr.status?.toLowerCase() === 'approved' ? 'success' :
                                lr.status?.toLowerCase() === 'rejected' ? 'danger' :
                                    lr.status?.toLowerCase() === 'confirmed' ? 'info' :
                                        'warning'
                        }`}>
                          {lr.status?.charAt(0).toUpperCase() + lr.status?.slice(1).toLowerCase() || 'Pending'}
                        </span>
                                        </td>
                                        <td>{lr.reason ? lr.reason.substring(0, 50) : '-'}...</td>
                                        <td>
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                onClick={() => handleOpenModal(lr)}
                                                className="me-2"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => handleDelete(lr.id)}
                                            >
                                                Delete
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default LeaveRequestManagement;