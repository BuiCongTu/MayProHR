import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import Select from 'react-select';
import { getAllDepartments } from '../../services/departmentService';
import { getAllLeaveReasons } from '../../services/moduleA/leaveReasonService';
import
{
    createLeaveRequest,
    deleteLeaveRequest,
    getLeaveRequestsByMonth,
    updateLeaveRequest
} from '../../services/moduleA/leaveRequestService';
import { getUsersByStructure } from '../../services/userService';
import '../../styles/payroll.css';

const LeaveRequestManagement = () =>
{

    // ==============================
    // STATE
    // ==============================
    const [departments, setDepartments] = useState([]);
    const [users, setUsers] = useState([]);
    const [leaveReasons, setLeaveReasons] = useState([]);

    const [filterDeptId, setFilterDeptId] = useState('');
    const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        userId: '',
        leaveReasonIds: [], // multi-select
        startDate: '',
        endDate: '',
        reason: '',
        status: 'pending'
    });

    const [saving, setSaving] = useState(false);

    // ==============================
    // HELPERS
    // ==============================
    const parseDateString = (dateStr) =>
        dateStr ? dateStr.split('T')[0] : '';

    const calculateDays = (startStr, endStr) =>
    {
        if (!startStr || !endStr) return 0;
        return Math.ceil(
            (new Date(endStr) - new Date(startStr)) / (1000 * 60 * 60 * 24)
        ) + 1;
    };

    // ==============================
    // LOAD DATA
    // ==============================
    useEffect(() =>
    {
        getAllDepartments().then(res =>
        {
            const data = res?.data || [];
            setDepartments(data);
            if (data.length) setFilterDeptId(String(data[0].id));
        });
        getAllLeaveReasons().then(setLeaveReasons);
    }, []);

    useEffect(() =>
    {
        if (!filterDeptId) return;
        getUsersByStructure({ departmentId: parseInt(filterDeptId) })
            .then(setUsers);
    }, [filterDeptId]);

    const loadLeaveRequests = async () =>
    {
        try
        {
            setLoading(true);
            const data = await getLeaveRequestsByMonth(filterMonth, parseInt(filterDeptId));
            setLeaveRequests(Array.isArray(data) ? data : []);
        } catch
        {
            setError('Failed to load leave requests');
        } finally
        {
            setLoading(false);
        }
    };

    useEffect(() =>
    {
        if (filterDeptId && filterMonth) loadLeaveRequests();
    }, [filterDeptId, filterMonth]);

    // ==============================
    // CREATE / UPDATE
    // ==============================
    const openCreateModal = () =>
    {
        setEditingId(null);
        setForm({
            userId: '',
            leaveReasonIds: [],
            startDate: '',
            endDate: '',
            reason: '',
            status: 'pending'
        });
        setShowModal(true);
    };

    const openEditModal = (lr) =>
    {
        setEditingId(lr.id);
        setForm({
            userId: lr.user.id,
            leaveReasonIds: lr.leaveReason ? lr.leaveReason.map(r => r.id) : [],
            startDate: parseDateString(lr.startDate),
            endDate: parseDateString(lr.endDate),
            reason: lr.reason || '',
            status: lr.status
        });
        setShowModal(true);
    };

    const handleSave = async () =>
    {
        if (!form.userId || !form.leaveReasonIds.length || !form.startDate || !form.endDate)
        {
            setError('Please fill all required fields.');
            return;
        }

        try
        {
            setSaving(true);
            const payload = {
                userId: Number(form.userId),
                leaveReasonIds: form.leaveReasonIds.map(Number),
                startDate: form.startDate,
                endDate: form.endDate,
                reason: form.reason,
                status: form.status
            };

            if (editingId)
            {
                await updateLeaveRequest(editingId, payload);
                setInfo('Leave request updated');
            } else
            {
                await createLeaveRequest(payload);
                setInfo('Leave request created');
            }

            setShowModal(false);
            loadLeaveRequests();
        } catch
        {
            setError('Save failed');
        } finally
        {
            setSaving(false);
        }
    };

    const handleDelete = async (id) =>
    {
        if (!window.confirm('Delete this leave request?')) return;
        await deleteLeaveRequest(id);
        loadLeaveRequests();
    };

    // ==============================
    // RENDER
    // ==============================
    return (
        <div className="payroll-list-container p-4">
            <h2>Leave Request Management</h2>

            {error && <Alert variant="danger">{error}</Alert>}
            {info && <Alert variant="info">{info}</Alert>}

            <Button className="mb-3" onClick={openCreateModal}>
                + New Leave Request
            </Button>

            <Card>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4"><Spinner /></div>
                    ) : (
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Reasons</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Days</th>
                                    <th>Status</th>
                                    <th width="160">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaveRequests.map(lr => (
                                    <tr key={lr.id}>
                                        <td>{lr.user.fullName}</td>
                                        <td>{lr.leaveReason.map(r => r.reason).join(', ')}</td>
                                        <td>{parseDateString(lr.startDate)}</td>
                                        <td>{parseDateString(lr.endDate)}</td>
                                        <td>{calculateDays(lr.startDate, lr.endDate)}</td>
                                        <td>{lr.status}</td>
                                        <td>
                                            <Button size="sm" onClick={() => openEditModal(lr)}>Edit</Button>{' '}
                                            <Button size="sm" variant="danger" onClick={() => handleDelete(lr.id)}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* MODAL */}
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingId ? 'Edit Leave Request' : 'Create Leave Request'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>User</Form.Label>
                            <Form.Select
                                value={form.userId}
                                disabled={!!editingId}
                                onChange={e => setForm({ ...form, userId: e.target.value })}
                            >
                                <option value="">Select user</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.fullName}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Leave Reasons</Form.Label>
                            <Select
                                isMulti
                                options={leaveReasons.map(r => ({ value: r.id, label: r.reason }))}
                                value={leaveReasons
                                    .filter(r => form.leaveReasonIds.includes(r.id))
                                    .map(r => ({ value: r.id, label: r.reason }))}
                                onChange={selected =>
                                    setForm({ ...form, leaveReasonIds: selected.map(s => s.value) })
                                }
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Start Date</Form.Label>
                            <Form.Control type="date"
                                value={form.startDate}
                                onChange={e => setForm({ ...form, startDate: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>End Date</Form.Label>
                            <Form.Control type="date"
                                value={form.endDate}
                                onChange={e => setForm({ ...form, endDate: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Reason (detail)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={form.reason}
                                onChange={e => setForm({ ...form, reason: e.target.value })}
                            />
                        </Form.Group>

                        {editingId && (
                            <Form.Select
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </Form.Select>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default LeaveRequestManagement;
