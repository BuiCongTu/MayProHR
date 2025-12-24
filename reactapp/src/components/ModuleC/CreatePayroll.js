import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import ErrorPage from '../../pages/ErrorPage';
import { getCurrentUser } from '../../services/authService';
import { getAllDepartments } from '../../services/departmentService';
import { generatePayroll } from '../../services/moduleC/payrollService';



const CreatePayroll = () =>
{
    const navigate = useNavigate();
    const user = getCurrentUser();

    // Factory Director là người tạo
    const isFactoryDirector = useMemo(() =>
    {
        const role = user?.roleName;
        return role === 'Factory Director' || role === 'FDirector';
    }, [user?.roleName]);

    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);

    const [form, setForm] = useState({
        departmentId: '',
        month: '', // YYYY-MM (from <input type="month" />)
        allowance: ''
    });

    const [submitting, setSubmitting] = useState(false);
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
            } catch (e)
            {
                setError(e?.message || 'can not load departments');
            } finally
            {
                setDepartmentsLoading(false);
            }
        };
        loadDepartments();
    }, []);

    if (!isFactoryDirector)
    {
        return (
            <ErrorPage
                code={403}
                title="Access Forbidden"
                message="Only Factory Director can create payroll."
            />
        );
    }

    const handleChange = (e) =>
    {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const toIsoDateFirstDay = (yyyyMm) =>
    {
        // Backend nhận LocalDate => cần YYYY-MM-DD
        // input type="month" trả về YYYY-MM
        if (!yyyyMm || typeof yyyyMm !== 'string' || !yyyyMm.includes('-')) return '';
        const [y, m] = yyyyMm.split('-');
        if (!y || !m) return '';
        return `${y}-${m}-01`;
    };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        setError('');
        setInfo('');

        if (!form.departmentId)
        {
            setError('Please select a department');
            return;
        }
        if (!form.month)
        {
            setError('Please select a month');
            return;
        }

        const monthIso = toIsoDateFirstDay(form.month);
        if (!monthIso)
        {
            setError('Invalid month format');
            return;
        }

        const allowanceNumber = form.allowance === '' ? 0 : Number(form.allowance);
        if (Number.isNaN(allowanceNumber) || allowanceNumber < 0)
        {
            setError('Allowance must be a number >= 0');
            return;
        }

        const confirmed = window.confirm(
            `Create payroll for department #${form.departmentId} for month ${form.month}?`
        );
        if (!confirmed) return;

        try
        {
            setSubmitting(true);

            const data = await generatePayroll(
                Number(form.departmentId),
                monthIso,
                allowanceNumber
            );

            setInfo('Payroll created successfully.');

            const payrollId = data?.payrollId || data?.id;
            if (payrollId)
            {
                navigate(`/payroll/${payrollId}`);
            } else
            {
                navigate('/payroll/list');
            }
        } catch (err)
        {
            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                'Create payroll failed';
            setError(msg);
        } finally
        {
            setSubmitting(false);
        }
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Tạo Bảng Lương (Factory Director)</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                </div>
            )}

            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Payroll Information</h6>
                </Card.Header>

                <Card.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row className="gy-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Department <span style={{ color: 'red' }}>*</span></Form.Label>
                                    {departmentsLoading ? (
                                        <div className="d-flex align-items-center gap-2">
                                            <Spinner animation="border" size="sm" />
                                            <span className="text-muted">Loading...</span>
                                        </div>
                                    ) : (
                                        <Form.Select
                                            name="departmentId"
                                            value={form.departmentId}
                                            onChange={handleChange}
                                        >
                                            <option value="">-- Select department --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Month <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="month"
                                        name="month"
                                        value={form.month}
                                        onChange={handleChange}
                                    />
                                    <Form.Text className="text-muted">
                                        The system will normalize to the 1st day of the month when creating payroll.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="gy-3 mt-1">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Allowance (optional)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="allowance"
                                        value={form.allowance}
                                        onChange={handleChange}
                                        min="0"
                                        step="1"
                                        placeholder="0"
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Created By</Form.Label>
                                    <Form.Control
                                        value={`${user?.fullName || 'N/A'} (${user?.roleName || 'N/A'})`}
                                        readOnly
                                    />
                                    <Form.Text className="text-muted">
                                        createdBy should be set in the backend based on the JWT of the Factory Director.
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <div className="mt-3 d-flex gap-2">
                            <Button type="submit" disabled={submitting}>
                                {submitting ? 'Creating...' : 'Create Payroll'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline-secondary"
                                disabled={submitting}
                                onClick={() => navigate('/payroll')}
                            >
                                Cancel
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
};

export default CreatePayroll;