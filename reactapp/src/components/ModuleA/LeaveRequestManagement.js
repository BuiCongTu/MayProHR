import { useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import { getCurrentUser } from '../../services/authService';
import {
    approveLeaveRequest,
    confirmLeaveRequest,
    getAllLeaveRequestsSimple,
    rejectLeaveRequest
} from '../../services/moduleA/leaveRequestService';
import '../../styles/payroll.css';

const LeaveRequestManagement = () =>
{
    const user = getCurrentUser();
    const roleName = user?.roleName;

    const isFactoryManager = roleName === 'Factory Manager';
    const isFactoryDirector = roleName === 'Factory Director';

    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
        } catch (e)
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
        } catch (e)
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
        } catch (e)
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
        } catch (e)
        {
            setError('Reject failed');
        }
    };

    const canShowActions = isFactoryManager || isFactoryDirector;

    return (
        <div className="payroll-list-container p-4">
            <h2>Leave Request Management</h2>

            {error && <Alert variant="danger">{error}</Alert>}

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
                                {canShowActions && <th width="220">Actions</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {leaveRequests.map(lr =>
                            {
                                const st = String(lr.status || '').toLowerCase();
                                const showFMButtons = isFactoryManager && st === 'pending';
                                const showFDButtons = isFactoryDirector && st === 'confirmed';

                                return (
                                    <tr key={lr.id}>
                                        <td>#{lr.id}</td>
                                        <td>{lr.user?.fullName || '-'}</td>
                                        <td>{lr.leaveReason?.reason || '-'}</td>
                                        <td>{lr.type || '-'}</td>
                                        <td>{parseDateString(lr.startDate)}</td>
                                        <td>{parseDateString(lr.endDate)}</td>
                                        <td>{lr.status || '-'}</td>

                                        {canShowActions && (
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