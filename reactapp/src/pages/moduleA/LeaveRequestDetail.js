import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Alert, Card, Spinner } from 'react-bootstrap';
import { getLeaveRequestById } from '../../services/moduleA/leaveRequestService';

const LeaveRequestDetail = () =>
{
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);

    useEffect(() =>
    {
        const load = async () =>
        {
            try
            {
                setLoading(true);
                setError('');
                const res = await getLeaveRequestById(id);
                setData(res || null);
            }
            catch (e)
            {
                setError('Failed to load leave request detail');
            }
            finally
            {
                setLoading(false);
            }
        };

        if (id) load();
    }, [id]);

    if (loading) return <div className="p-4 text-center"><Spinner /></div>;

    return (
        <div className="p-4">
            <div className="mb-3">
                <Link to="/leave-request">← Back to list</Link>
            </div>

            <h3>Leave Request Detail #{id}</h3>

            {error && <Alert variant="danger">{error}</Alert>}

            {!error && !data && <Alert variant="warning">No data</Alert>}

            {data && (
                <Card>
                    <Card.Body>
                        <div><b>Status:</b> {data.status}</div>
                        <div><b>Employee:</b> {data.user?.fullName || '-'}</div>
                        <div><b>Type:</b> {data.type}</div>
                        <div><b>Leave Reason:</b> {data.leaveReason?.reason || '-'}</div>
                        <div><b>Start:</b> {String(data.startDate || '')}</div>
                        <div><b>End:</b> {String(data.endDate || '')}</div>
                        <div><b>Reason:</b> {data.reason || '-'}</div>
                        <div><b>Comment:</b> {data.comment || '-'}</div>
                        <div><b>Reject Reason:</b> {data.rejectReason || '-'}</div>
                    </Card.Body>
                </Card>
            )}
        </div>
    );
};

export default LeaveRequestDetail;