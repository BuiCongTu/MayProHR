import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import payrollService from '../../services/moduleC/payrollService';

const toISODateFirstOfMonth = (yyyyMM) => {
    if (!yyyyMM) return null;
    const [y, m] = yyyyMM.split('-');
    if (!y || !m) return null;
    return `${y}-${m}-01`;
};

const toYYYYMM = (isoDate) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
};

const formatCurrency = (value) => {
    const v = value ?? 0;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(v);
};

const PayrollEmployeeCalculator = () => {
    const { payrollId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [payroll, setPayroll] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loadingPayroll, setLoadingPayroll] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [month, setMonth] = useState('');

    const [manualAllowance, setManualAllowance] = useState(0);
    const [note, setNote] = useState('');
    const [overrideActualWorkingDays, setOverrideActualWorkingDays] = useState('');
    const [overrideOtWeekdayHours, setOverrideOtWeekdayHours] = useState('');
    const [overrideOtHolidayHours, setOverrideOtHolidayHours] = useState('');

    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const allowConfirmedEdit = Boolean(location?.state?.allowConfirmedEdit);

    const selectableEmployees = useMemo(() => {
        if (allowConfirmedEdit) return employees; // cho phép chọn cả confirmed khi vào từ nút Edit
        return employees.filter(e => (e.calculationStatus || 'draft') !== 'confirmed');
    }, [employees, allowConfirmedEdit]);

    const confirmedEmployees = useMemo(() => {
        return employees.filter(e => (e.calculationStatus || 'draft') === 'confirmed');
    }, [employees]);

    const requestPayload = useMemo(() => {
        const isoMonth = toISODateFirstOfMonth(month);
        return {
            payrollId: payrollId ? Number(payrollId) : null,
            userId: selectedUserId ? Number(selectedUserId) : null,
            month: isoMonth,

            allowance: manualAllowance === '' ? 0 : Number(manualAllowance || 0),
            note: note || null,

            overrideActualWorkingDays: overrideActualWorkingDays === '' ? null : Number(overrideActualWorkingDays),
            overrideOtWeekdayHours: overrideOtWeekdayHours === '' ? null : Number(overrideOtWeekdayHours),
            overrideOtHolidayHours: overrideOtHolidayHours === '' ? null : Number(overrideOtHolidayHours)
        };
    }, [
        payrollId,
        selectedUserId,
        month,
        manualAllowance,
        note,
        overrideActualWorkingDays,
        overrideOtWeekdayHours,
        overrideOtHolidayHours
    ]);

    const reloadPayroll = async () => {
        if (!payrollId) {
            throw new Error('Thiếu payrollId');
        }

        // 1) Sync from attendance: tạo các draft employeePayroll bị thiếu
        await payrollService.syncPayrollEmployeesFromAttendance(Number(payrollId));

        // 2) Reload payroll detail (để dropdown thấy đầy đủ)
        const data = await payrollService.getPayrollDetail(Number(payrollId));
        setPayroll(data);

        const eps = Array.isArray(data?.employeePayrolls) ? data.employeePayrolls : [];
        setEmployees(eps);

        if (data?.month) {
            setMonth((prev) => prev || toYYYYMM(data.month));
        }
    };

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                setLoadingPayroll(true);
                setError('');
                await reloadPayroll();
            } catch (e) {
                if (!isMounted) return;
                const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
                setError(backendMsg || e?.message || 'Không load được payroll');
                setPayroll(null);
                setEmployees([]);
            } finally {
                if (isMounted) setLoadingPayroll(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [payrollId]);

    useEffect(() => {
        const state = location?.state;
        if (state?.userId && !selectedUserId) {
            setSelectedUserId(String(state.userId));
        }
        if (state?.month && !month) {
            setMonth(toYYYYMM(state.month));
        }
    }, [location, selectedUserId, month]);

    const handlePreview = async () => {
        try {
            setError('');
            setLoadingPreview(true);

            console.log('[PayrollEmployeeCalculator] preview payload:', requestPayload);

            if (!requestPayload.payrollId) throw new Error('Thiếu payrollId');
            if (!requestPayload.userId) throw new Error('Vui lòng chọn nhân viên');
            if (!requestPayload.month) throw new Error('Vui lòng chọn tháng (YYYY-MM)');

            const data = await payrollService.previewEmployeePayroll(requestPayload);
            setPreview(data);

            if (data?.note && !note) setNote(data.note);
        } catch (e) {
            console.error('[PayrollEmployeeCalculator] preview error:', e?.response?.data || e);

            const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
            setError(backendMsg || e?.message || 'Preview lỗi');
            setPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setError('');
            setSaving(true);

            console.log('[PayrollEmployeeCalculator] confirm payload:', requestPayload);

            if (!preview) throw new Error('Bạn cần Preview trước khi Confirm');

            await payrollService.confirmEmployeePayroll(requestPayload);

            // reload để status/danh sách cập nhật ngay (draft -> confirmed)
            setPreview(null);
            await reloadPayroll();

            alert('Confirm & save thành công!');
        } catch (e) {
            console.error('[PayrollEmployeeCalculator] confirm error:', e?.response?.data || e);

            const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
            setError(backendMsg || e?.message || 'Confirm lỗi');
        } finally {
            setSaving(false);
        }
    };

    const handleEditConfirmed = (emp) => {
        navigate(`/payroll/${payrollId}/calculate`, {
            state: {
                userId: emp.userId,
                month: payroll?.month,
                allowConfirmedEdit: true
            }
        });
    };

    return (
        <div className="p-3">
            <h4>Tính lương nhân viên (Preview → Edit → Confirm)</h4>

            {error ? <Alert variant="danger" className="mt-3">{error}</Alert> : null}

            {loadingPayroll ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : null}

            <Card className="mt-3">
                <Card.Header>1) Chọn nhân viên + tháng</Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>
                                    Nhân viên {allowConfirmedEdit ? '(bao gồm confirmed)' : '(chỉ draft/calculated)'}
                                </Form.Label>
                                <Form.Select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    disabled={loadingPayroll || selectableEmployees.length === 0}
                                >
                                    <option value="">-- Chọn nhân viên --</option>
                                    {selectableEmployees.map((emp) => (
                                        <option key={emp.userId} value={emp.userId}>
                                            {emp.fullName} (ID: {emp.userId}) - {emp.salaryType} [{emp.calculationStatus || 'draft'}]
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Tháng lương</Form.Label>
                                <Form.Control
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3} className="d-flex align-items-end gap-2">
                            <Button variant="primary" onClick={handlePreview} disabled={loadingPreview}>
                                {loadingPreview ? 'Đang tính...' : 'Preview (Tự động tính)'}
                            </Button>
                            <Button
                                variant="outline-secondary"
                                onClick={async () => {
                                    try {
                                        setError('');
                                        setLoadingPayroll(true);
                                        await reloadPayroll();
                                    } catch (e) {
                                        const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
                                        setError(backendMsg || e?.message || 'Sync lỗi');
                                    } finally {
                                        setLoadingPayroll(false);
                                    }
                                }}
                                disabled={loadingPayroll}
                            >
                                Sync
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="mt-3">
                <Card.Header>2) Input có thể chỉnh trước khi Confirm</Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Allowance (bổ sung)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={manualAllowance}
                                    onChange={(e) => setManualAllowance(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Override actualWorkingDays</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={overrideActualWorkingDays}
                                    onChange={(e) => setOverrideActualWorkingDays(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Override OT weekday hours</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={overrideOtWeekdayHours}
                                    onChange={(e) => setOverrideOtWeekdayHours(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Override OT holiday hours</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={overrideOtHolidayHours}
                                    onChange={(e) => setOverrideOtHolidayHours(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Note</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="mt-3">
                <Card.Header>3) Kết quả tính lương (Preview)</Card.Header>
                <Card.Body>
                    {loadingPreview ? (
                        <div className="text-center p-4"><Spinner animation="border" /></div>
                    ) : !preview ? (
                        <Alert variant="info">Hãy chọn nhân viên + nhấn Preview.</Alert>
                    ) : (
                        <>
                            <Row className="mb-3">
                                <Col md={4}><strong>Nhân viên:</strong> {preview.fullName}</Col>
                                <Col md={4}><strong>SalaryType:</strong> {preview.salaryType}</Col>
                                <Col md={4}><strong>BaseSalary:</strong> {formatCurrency(preview.baseSalary)}</Col>
                            </Row>

                            <Table bordered size="sm">
                                <tbody>
                                <tr>
                                    <td style={{width: '40%'}}><strong>Total Pay (NET)</strong></td>
                                    <td><strong>{formatCurrency(preview.totalPay)}</strong></td>
                                </tr>
                                </tbody>
                            </Table>

                            <div className="d-flex justify-content-end gap-2">
                                <Button variant="secondary" onClick={handlePreview} disabled={loadingPreview || saving}>
                                    Tính lại (Preview)
                                </Button>
                                <Button variant="success" onClick={handleConfirm} disabled={saving}>
                                    {saving ? 'Đang lưu...' : 'Confirm & Save'}
                                </Button>
                            </div>
                        </>
                    )}
                </Card.Body>
            </Card>

            <Card className="mt-4">
                <Card.Header>Danh sách nhân viên đã Confirmed</Card.Header>
                <Card.Body>
                    {confirmedEmployees.length === 0 ? (
                        <Alert variant="info" className="mb-0">
                            Chưa có nhân viên nào ở trạng thái confirmed.
                        </Alert>
                    ) : (
                        <Table bordered hover size="sm" className="mb-0">
                            <thead>
                            <tr>
                                <th>User ID</th>
                                <th>Full name</th>
                                <th>Salary type</th>
                                <th>Status</th>
                                <th className="text-end">Total Pay</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {confirmedEmployees.map((emp) => (
                                <tr key={emp.employeePayrollId || emp.userId}>
                                    <td>{emp.userId}</td>
                                    <td>{emp.fullName}</td>
                                    <td>{emp.salaryType}</td>
                                    <td>{emp.calculationStatus || 'confirmed'}</td>
                                    <td className="text-end">{formatCurrency(emp.totalPay)}</td>
                                    <td className="d-flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="info"
                                            onClick={() => navigate(`/payroll/${payrollId}/employee/${emp.employeePayrollId}`)}
                                            disabled={!emp.employeePayrollId}
                                        >
                                            View
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="warning"
                                            onClick={() => handleEditConfirmed(emp)}
                                        >
                                            Edit
                                        </Button>
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

export default PayrollEmployeeCalculator;

