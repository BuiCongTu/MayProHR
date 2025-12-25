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

    // Factory Director và Accounting được quyền tạo Payroll
    const canCreatePayroll = useMemo(() =>
    {
        const role = user?.roleName;
        return role === 'Factory Director' || role === 'Accounting';
    }, [user?.roleName]);

    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);

    const now = new Date();
    const [form, setForm] = useState({
        departmentId: '',
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1).padStart(2, '0'),
        allowance: '',
        createDefaultPending: true
    });

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const [autoPayrollHint, setAutoPayrollHint] = useState('');

    const selectedYearMonth = useMemo(() =>
    {
        if (!form.year || !form.month) return '';
        return `${form.year}-${String(form.month).padStart(2, '0')}`;
    }, [form.year, form.month]);

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

    // Hiển thị “ngày cuối tháng” như gợi ý lịch auto
    useEffect(() =>
    {
        const yyyyMm = selectedYearMonth;
        if (!yyyyMm || typeof yyyyMm !== 'string' || !yyyyMm.includes('-'))
        {
            setAutoPayrollHint('');
            return;
        }

        const [yStr, mStr] = yyyyMm.split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        if (!y || !m)
        {
            setAutoPayrollHint('');
            return;
        }

        const lastDay = new Date(y, m, 0);
        const dd = String(lastDay.getDate()).padStart(2, '0');
        const mm = String(m).padStart(2, '0');

        setAutoPayrollHint(
            `Gợi ý lịch tự động: ngày cuối tháng ${dd}/${mm}/${y}.`
        );
    }, [selectedYearMonth]);

    if (!canCreatePayroll)
    {
        return (
            <ErrorPage
                code={403}
                title="Access Forbidden"
                message="Only Factory Director or Accounting can create payroll."
            />
        );
    }

    const handleChange = (e) =>
    {
        const { name, value, type, checked } = e.target;
        const nextValue = type === 'checkbox' ? checked : value;
        setForm(prev => ({ ...prev, [name]: nextValue }));
    };

    const toIsoDateFirstDayFromYearMonth = (yearStr, monthStr) =>
    {
        const y = String(yearStr || '').trim();
        const m = String(monthStr || '').trim();
        if (!/^\d{4}$/.test(y)) return '';
        if (!/^\d{1,2}$/.test(m) && !/^\d{2}$/.test(m)) return '';
        const mm = String(Number(m)).padStart(2, '0');
        return `${y}-${mm}-01`;
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
        if (!form.year || !form.month)
        {
            setError('Please select year and month');
            return;
        }

        const monthIso = toIsoDateFirstDayFromYearMonth(form.year, form.month);
        if (!monthIso)
        {
            setError('Invalid year/month');
            return;
        }

        const allowanceNumber = form.allowance === '' ? 0 : Number(form.allowance);
        if (Number.isNaN(allowanceNumber) || allowanceNumber < 0)
        {
            setError('Allowance must be a number >= 0');
            return;
        }

        const modeText = form.createDefaultPending
            ? 'DEFAULT (Pending) payroll'
            : 'payroll';

        const confirmed = window.confirm(
            `Create ${modeText} for department #${form.departmentId} for month ${selectedYearMonth}?`
        );
        if (!confirmed) return;

        try
        {
            setSubmitting(true);

            // API backend đúng là: POST /api/payroll/generate
            const data = await generatePayroll(
                Number(form.departmentId),
                monthIso,
                form.createDefaultPending ? 0 : allowanceNumber
            );

            setInfo(
                form.createDefaultPending
                    ? 'Đã tạo bảng lương mặc định (Pending).'
                    : 'Payroll created successfully.'
            );

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
            <h2>Tạo Bảng Lương (Factory Director / Accounting)</h2>

            {(error || info || autoPayrollHint) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                    {autoPayrollHint && <Alert variant="info" className="mb-0">{autoPayrollHint}</Alert>}
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

                                    <Row className="g-2">
                                        <Col xs={6}>
                                            <Form.Select
                                                name="year"
                                                value={form.year}
                                                onChange={handleChange}
                                            >
                                                {Array.from({ length: 7 }).map((_, i) =>
                                                {
                                                    const y = String(now.getFullYear() - 3 + i);
                                                    return <option key={y} value={y}>{y}</option>;
                                                })}
                                            </Form.Select>
                                        </Col>

                                        <Col xs={6}>
                                            <Form.Select
                                                name="month"
                                                value={form.month}
                                                onChange={handleChange}
                                            >
                                                {Array.from({ length: 12 }).map((_, i) =>
                                                {
                                                    const m = String(i + 1).padStart(2, '0');
                                                    return <option key={m} value={m}>{m}</option>;
                                                })}
                                            </Form.Select>
                                        </Col>
                                    </Row>

                                    <Form.Text className="text-muted">
                                        Tháng/Năm đã chọn: <strong>{selectedYearMonth}</strong> (gửi backend dạng: {toIsoDateFirstDayFromYearMonth(form.year, form.month)})
                                    </Form.Text>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="gy-3 mt-1">
                            <Col md={6}>
                                <Form.Group className="mb-2">
                                    <Form.Check
                                        type="checkbox"
                                        name="createDefaultPending"
                                        checked={!!form.createDefaultPending}
                                        onChange={handleChange}
                                        label="Tạo bảng lương mặc định cho employee theo Department + Tháng (Pending)"
                                    />
                                </Form.Group>

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
                                        disabled={!!form.createDefaultPending}
                                    />
                                </Form.Group>
                            </Col>

                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Created By</Form.Label>
                                    <Form.Control
                                        value={`${user?.roleName || 'N/A'} (${user?.roleName || 'N/A'})`}
                                        readOnly
                                    />
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