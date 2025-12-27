import { useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { getCurrentUser } from '../../services/authService';
import
{
    approveLeaveRequest,
    confirmLeaveRequest,
    getAllLeaveRequestsSimple,
    rejectLeaveRequest
} from '../../services/moduleA/leaveRequestService';
import '../../styles/payroll.css';

/* ===== STATUS STYLES ===== */
const pendingStyle = {
    color: '#ed6c02',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6
};

const blinkDot = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#ed6c02',
    animation: 'blink 1s infinite'
};

const approvedStyle = { color: 'green', fontWeight: 600 };
const rejectedStyle = { color: 'red', fontWeight: 600 };
/* ========================= */

const LeaveRequestManagement = () =>
{
    const user = getCurrentUser();
    const roleName = user?.roleName;

    const isFactoryManager = roleName === 'Factory Manager';
    const isFactoryDirector = roleName === 'Factory Director';

    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('pending');

    const parseDateString = (dateStr) =>
        dateStr ? String(dateStr).split('T')[0] : '';

    const loadLeaveRequests = async () =>
    {
        try
        {
            setLoading(true);
            setError('');
            const data = await getAllLeaveRequestsSimple();
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
        loadLeaveRequests();
    }, []);

    const handleConfirm = async (id) =>
    {
        try
        {
            await confirmLeaveRequest(id);
            loadLeaveRequests();
        } catch
        {
            setError('Confirm failed');
        }
    };

    const handleApprove = async (id) =>
    {
        try
        {
            await approveLeaveRequest(id);
            loadLeaveRequests();
        } catch
        {
            setError('Approve failed');
        }
    };

    const handleReject = async (id) =>
    {
        const reason = window.prompt('Enter rejection reason:');
        if (!reason) return;

        try
        {
            await rejectLeaveRequest(id, reason);
            loadLeaveRequests();
        } catch
        {
            setError('Reject failed');
        }
    };

    /* ===== FILTER DATA ===== */
    const filteredRequests = leaveRequests.filter(lr =>
    {
        const st = String(lr.status || '').toLowerCase();

        // Director: Pending tab = pending + confirmed
        if (isFactoryDirector && statusFilter === 'pending')
        {
            return st === 'pending' || st === 'confirmed';
        }

        return st === statusFilter;
    });

    return (
        <div className="payroll-list-container p-4">
            <h2>Leave Request Management</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* STATUS FILTER */}
            <div className="mb-3">
                <select
                    className="form-select w-auto"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <Card>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4"><Spinner /></div>
                    ) : (
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Employee</th>
                                    <th>Leave Reason</th>
                                    <th>Type</th>
                                    <th>Start</th>
                                    <th>End</th>
                                    <th>Status</th>

                                    {statusFilter === 'pending' && <th width="220">Actions</th>}
                                    {statusFilter === 'approved' && <th>Approved By</th>}
                                    {statusFilter === 'rejected' && <th>Rejected Reason</th>}
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center">
                                            No leave requests found.
                                        </td>
                                    </tr>
                                ) : filteredRequests.map(lr =>
                                {
                                    const st = String(lr.status || '').toLowerCase();

                                    const showFMButtons =
                                        isFactoryManager && st === 'pending';

                                    const showFDButtons =
                                        isFactoryDirector && st === 'confirmed';

                                    return (
                                        <tr key={lr.id}>
                                            <td>#{lr.id}</td>
                                            <td>{lr.user?.fullName || '-'}</td>
                                            <td>{lr.leaveReason?.reason || '-'}</td>
                                            <td>{lr.type || '-'}</td>
                                            <td>{parseDateString(lr.startDate)}</td>
                                            <td>{parseDateString(lr.endDate)}</td>

                                            {/* STATUS */}
                                            <td>
                                                {st === 'pending' && (
                                                    <span style={pendingStyle}>
                                                        <span style={blinkDot} />
                                                        Pending
                                                    </span>
                                                )}
                                                {st === 'confirmed' && (
                                                    <span style={pendingStyle}>Pending</span>
                                                )}
                                                {st === 'approved' && (
                                                    <span style={approvedStyle}>✔ Approved</span>
                                                )}
                                                {st === 'rejected' && (
                                                    <span style={rejectedStyle}>✖ Rejected</span>
                                                )}
                                            </td>

                                            {/* ACTION / APPROVED BY / REJECTED REASON */}
                                            {statusFilter === 'pending' && (
                                                <td>
                                                    {showFMButtons && (
                                                        <>
                                                            <Button size="sm" variant="success" onClick={() => handleConfirm(lr.id)}>
                                                                Confirm
                                                            </Button>{' '}
                                                            <Button size="sm" variant="danger" onClick={() => handleReject(lr.id)}>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}

                                                    {showFDButtons && (
                                                        <>
                                                            <Button size="sm" variant="primary" onClick={() => handleApprove(lr.id)}>
                                                                Approve
                                                            </Button>{' '}
                                                            <Button size="sm" variant="danger" onClick={() => handleReject(lr.id)}>
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </td>
                                            )}

                                            {statusFilter === 'approved' && (
                                                <td>{lr.approvedByName || 'Factory Director'}</td>
                                            )}

                                            {statusFilter === 'rejected' && (
                                                <td>{lr.rejectReason || '-'}</td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            <style>
                {`
                @keyframes blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.2; }
                    100% { opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};

export default LeaveRequestManagement;
