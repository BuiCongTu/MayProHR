import { useEffect, useMemo, useState } from 'react';
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
    const [overrideProductCount, setOverrideProductCount] = useState('');
    const [overrideUnitPrice, setOverrideUnitPrice] = useState('');

    const [preview, setPreview] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const allowConfirmedEdit = Boolean(location?.state?.allowConfirmedEdit);

    const selectableEmployees = useMemo(() => {
        if (allowConfirmedEdit) return employees;
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
            overrideOtHolidayHours: overrideOtHolidayHours === '' ? null : Number(overrideOtHolidayHours),
            overrideProductCount: overrideProductCount === '' ? null : Number(overrideProductCount),
            overrideUnitPrice: overrideUnitPrice === '' ? null : Number(overrideUnitPrice)
        };
    }, [
        payrollId,
        selectedUserId,
        month,
        manualAllowance,
        note,
        overrideActualWorkingDays,
        overrideOtWeekdayHours,
        overrideOtHolidayHours,
        overrideProductCount,
        overrideUnitPrice
    ]);

    const reloadPayroll = async () => {
        if (!payrollId) throw new Error('Missing payrollId');

        await payrollService.syncPayrollEmployeesFromAttendance(Number(payrollId));

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
                setError(backendMsg || e?.message || 'cannot load payroll');
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

        if (state?.userId != null) {
            setSelectedUserId(String(state.userId));
        }
        if (state?.month) {
            setMonth(toYYYYMM(state.month));
        }

        setPreview(null);
        setError('');

        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }, [location?.state?.userId, location?.state?.month, location?.key]);


    const handlePreview = async () => {
        try {
            setError('');
            setLoadingPreview(true);

            if (!requestPayload.payrollId) throw new Error('Missing payrollId');
            if (!requestPayload.userId) throw new Error('Please select an employee');
            if (!requestPayload.month) throw new Error('Please select month');

            const data = await payrollService.previewEmployeePayroll(requestPayload);
            setPreview(data);

            if (data?.note && !note) setNote(data.note);
        } catch (e) {
            const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
            setError(backendMsg || e?.message || 'Error Preview');
            setPreview(null);
        } finally {
            setLoadingPreview(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setError('');
            setSaving(true);

            if (!preview) throw new Error('No preview data to confirm');

            await payrollService.confirmEmployeePayroll(requestPayload);

            setPreview(null);
            await reloadPayroll();

            alert('Employee payroll confirmed and saved successfully.');
        } catch (e) {
            const backendMsg = e?.response?.data?.message || e?.response?.data?.error;
            setError(backendMsg || e?.message || 'Error Confirm');
        } finally {
            setSaving(false);
        }
    };

    const handleEditConfirmed = (emp) => {
        navigate(`/payroll/${payrollId}/calculate`, {
            state: { userId: emp.userId, month: payroll?.month, allowConfirmedEdit: true }
        });
    };

    return (
        <div className="p-3">
            <h4><strong>Calculate Employee Salaries (Preview → Edit → Confirm)</strong></h4>

            {error ? <Alert variant="danger" className="mt-3">{error}</Alert> : null}

            {loadingPayroll ? (
                <div className="text-center p-4">
                    <Spinner animation="border" />
                </div>
            ) : null}


            <Card className="mt-3">
                <Card.Header>
                    <strong>1. Select Employee + month </strong>
                    <span className="text-danger">*</span>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>
                                    Employee List {allowConfirmedEdit ? '(include confirmed)' : '(only draft/calculated)'}
                                    <span className="text-danger">*</span>
                                </Form.Label>
                                <Form.Select
                                    value={selectedUserId}
                                    onChange={(e) => setSelectedUserId(e.target.value)}
                                    disabled={loadingPayroll || selectableEmployees.length === 0}
                                >
                                    <option value="">-- select employee --</option>
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
                                <Form.Label>Month <span className="text-danger">*</span></Form.Label>
                                <Form.Control
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3} className="d-flex align-items-end gap-2">
                            <Button variant="primary" onClick={handlePreview} disabled={loadingPreview}>
                                {loadingPreview ? 'Calculating...' : 'Preview (Auto Calculation)'}
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
                                        setError(backendMsg || e?.message || 'Error Sync');
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
                <Card.Header>
                    <strong>2. Review Payroll </strong>
                </Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Allowance</Form.Label>
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

                        {preview?.salaryType === 'ProductBased' && (
                            <>
                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Override Product Count</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={overrideProductCount}
                                            onChange={(e) => setOverrideProductCount(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>

                                <Col md={3}>
                                    <Form.Group>
                                        <Form.Label>Override Unit Price</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="0.1"
                                            value={overrideUnitPrice}
                                            onChange={(e) => setOverrideUnitPrice(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </>
                        )}

                    </Row>
                </Card.Body>
            </Card>

            <Card className="mt-3">
                <Card className="mt-3">
                    <Card.Header><strong>3. Preview for Calculator</strong></Card.Header>
                    <Card.Body>
                        {loadingPreview ? (
                            <div className="text-center p-4"><Spinner animation="border" /></div>
                        ) : !preview ? (
                            <Alert variant="info">Select Employee</Alert>
                        ) : (
                            <>
                                <Row className="mb-3">
                                  <Col md={4}><strong>Employee Name:</strong> {preview.fullName}</Col>
                                  <Col md={4}><strong>Salary Type:</strong> {preview.salaryType}</Col>
                                  <Col md={4}><strong>Month:</strong> {month}</Col>
                                </Row>

                                {/* === INPUTS (read-only display for transparency) === */}
                                <h6 className="mb-2"><strong>1.Display for Transparency</strong></h6>
                                <Table bordered size="sm" className="mb-4">
                                  <tbody>
                                    <tr>
                                      <td style={{ width: '40%' }}>Base Salary</td>
                                      <td>{formatCurrency(preview.baseSalary)}</td>
                                    </tr>
                                    <tr>
                                      <td>Wage Coefficient</td>
                                      <td>{preview.wageCoefficient ?? '-'}</td>
                                    </tr>

                                    <tr>
                                      <td>Standard Working Days</td>
                                      <td>{preview.standardWorkingDays ?? 26}</td>
                                    </tr>
                                    <tr>
                                      <td>Actual Working Days</td>
                                      <td>{preview.actualWorkingDays ?? 0}</td>
                                    </tr>
                                    <tr>
                                      <td>Paid Leave Days</td>
                                      <td>{preview.paidLeaveDays ?? 0}</td>
                                    </tr>
                                    <tr>
                                      <td>Unpaid Leave Days</td>
                                      <td>{preview.unpaidLeaveDays ?? 0}</td>
                                    </tr>
                                    <tr>
                                      <td>Late Count</td>
                                      <td>{preview.lateCount ?? 0}</td>
                                    </tr>

                                    <tr>
                                      <td>OT1 Hours (Weekday)</td>
                                      <td>{preview.ot1Hours ?? 0}</td>
                                    </tr>
                                    <tr>
                                      <td>OT2 Hours (Holiday/Sun)</td>
                                      <td>{preview.ot2Hours ?? 0}</td>
                                    </tr>

                                    <tr>
                                      <td>Product Count</td>
                                      <td>{preview.productCount ?? 0}</td>
                                    </tr>
                                    <tr>
                                      <td>Unit Price</td>
                                      <td>{formatCurrency(preview.unitPrice)}</td>
                                    </tr>

                                    <tr>
                                      <td>Allowance (total)</td>
                                      <td>{formatCurrency(preview.allowance)}</td>
                                    </tr>
                                  </tbody>
                                </Table>

                                {/* === RESULTS (read-only) === */}
                                <h6 className="mb-2"><strong>2. Results</strong></h6>
                                <Table bordered size="sm" className="mb-3">
                                    <tbody>
                                    <tr>
                                        <td style={{ width: '40%' }}>Time Salary (A)</td>
                                        <td>{formatCurrency(preview.timeSalary)}</td>
                                    </tr>
                                    <tr>
                                        <td>Product Bonus (B)</td>
                                        <td>{formatCurrency(preview.productBonus)}</td>
                                    </tr>
                                    <tr>
                                        <td>Overtime Pay (C)</td>
                                        <td>{formatCurrency(preview.overtimePay)}</td>
                                    </tr>

                                    <tr>
                                        <td>Gross income for tax (D = A + B + C)</td>
                                        <td>{formatCurrency(preview.grossIncomeForTax)}</td>
                                    </tr>

                                    <tr>
                                        <td><strong>Cash deductions</strong></td>
                                        <td></td>
                                    </tr>

                                    <tr>
                                        <td>Late Penalty / time</td>
                                        <td className="text-danger">-{formatCurrency(preview.latePenalty)}</td>
                                    </tr>
                                    <tr>
                                        <td>Late Penalty Total (E = lateCount × latePenalty)</td>
                                        <td className="text-danger">
                                            -{formatCurrency((preview.lateCount ?? 0) * (preview.latePenalty ?? 0))}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Insurance (F)</td>
                                        <td className="text-danger">-{formatCurrency(preview.insurance)}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Cash Deduction Total (E + F)</strong></td>
                                        <td className="text-danger">
                                            <strong>
                                                -{formatCurrency(((preview.lateCount ?? 0) * (preview.latePenalty ?? 0)) + (preview.insurance ?? 0))}
                                            </strong>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td><strong>Income after cash deductions (D - (E+F))</strong></td>
                                        <td>
                                            <strong>
                                                {formatCurrency((preview.grossIncomeForTax ?? 0) - (((preview.lateCount ?? 0) * (preview.latePenalty ?? 0)) + (preview.insurance ?? 0)))}
                                            </strong>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td><strong>Tax deductions (from tax engine)</strong></td>
                                        <td></td>
                                    </tr>

                                    <tr>
                                        <td>Personal Deduction (G)</td>
                                        <td className="text-danger">-{formatCurrency(preview.personalDeduction)}</td>
                                    </tr>
                                    <tr>
                                        <td>Dependent Deduction (H)</td>
                                        <td className="text-danger">-{formatCurrency(preview.dependentDeduction)}</td>
                                    </tr>
                                    <tr>
                                        <td>Insurance Deduction (for tax)</td>
                                        <td className="text-danger">-{formatCurrency(preview.insuranceDeduction)}</td>
                                    </tr>

                                    <tr>
                                        <td><strong>Total Tax Deduction</strong></td>
                                        <td className="text-danger">
                                            <strong>-{formatCurrency(preview.taxDeductionTotal)}</strong>
                                        </td>
                                    </tr>

                                    <tr>
                                        <td><strong>Taxable Income (from tax engine)</strong></td>
                                        <td><strong>{formatCurrency(preview.taxableIncome)}</strong></td>
                                    </tr>

                                    <tr>
                                        <td>Personal Income Tax / PIT</td>
                                        <td className="text-danger">-{formatCurrency(preview.personalIncomeTax)}</td>
                                    </tr>

                                    <tr className="table-success">
                                        <td><strong>Total Pay (NET)</strong></td>
                                        <td><strong>{formatCurrency(preview.totalPay)}</strong></td>
                                    </tr>
                                    </tbody>
                                </Table>


                                {preview?.taxCalculation?.note ? (
                                    <Alert variant="secondary" className="mt-3" style={{ whiteSpace: 'pre-wrap' }}>
                                        <strong>Personal income tax calculation details (from BE):</strong>
                                        {'\n\n'}
                                        {preview.taxCalculation.note}
                                    </Alert>
                                ) : null}
                                <div className="d-flex justify-content-end gap-2">
                                  <Button variant="secondary" onClick={handlePreview} disabled={loadingPreview || saving}>
                                    Recalculate (Preview)
                                  </Button>
                                  <Button variant="success" onClick={handleConfirm} disabled={saving}>
                                    {saving ? 'Saving...' : 'Confirm & Save'}
                                  </Button>
                                </div>
                              </>
                            )}
                          </Card.Body>
                        </Card>
            </Card>
{/*//list*/}
            <Card className="mt-4">
                <Card.Header><strong>4. List of Confirmed Employees</strong></Card.Header>
                <Card.Body>
                    {confirmedEmployees.length === 0 ? (
                        <Alert variant="info" className="mb-0">
                            No employees are currently in the confirmed status.                        </Alert>
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