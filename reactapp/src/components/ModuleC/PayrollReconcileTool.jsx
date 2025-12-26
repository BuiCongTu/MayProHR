import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';

function fmt(v) {
    if (v === null || v === undefined || v === '') return '';
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    return n.toLocaleString('vi-VN');
}
function num(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
}
function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function PayrollReconcileTool() {
    const [error, setError] = useState('');

    // --- master data ---
    const [payrollList, setPayrollList] = useState([]);
    const [loadingPayrollList, setLoadingPayrollList] = useState(false);

    const [selectedPayrollId, setSelectedPayrollId] = useState('');
    const [selectedPayrollDetail, setSelectedPayrollDetail] = useState(null);
    const [loadingPayrollDetail, setLoadingPayrollDetail] = useState(false);

    // --- selection ---
    const [selectedEmployeePayrollId, setSelectedEmployeePayrollId] = useState('');

    // --- db + expected ---
    const [dbBreakdown, setDbBreakdown] = useState(null);
    const [loadingDb, setLoadingDb] = useState(false);

    const [expected, setExpected] = useState(null);
    const [loadingExpected, setLoadingExpected] = useState(false);

    // --- input form ---
    const [form, setForm] = useState({
        userId: '',
        employeePayrollId: '',
        payrollMonth: new Date().toISOString().slice(0, 7), // YYYY-MM

        salaryType: '',

        baseSalary: '',
        standardWorkingDays: '',
        actualWorkingDays: '0',

        lateCount: '0',
        latePenaltyPerTime: '50000',

        ot1Hours: '0',
        ot2Hours: '0',

        productCount: '',
        unitPrice: '',

        allowance: '0',

        // tax override
        overridePersonalDeduction: '',
        overrideDependentDeduction: ''
    });

    // Load payroll list
    useEffect(() => {
        const run = async () => {
            try {
                setLoadingPayrollList(true);
                setError('');
                const res = await axios.get('/api/payroll/list', { params: { page: 0, size: 50 } });
                const body = res?.data;
                const list = body?.data ?? [];
                setPayrollList(Array.isArray(list) ? list : []);
            } catch (e) {
                setError(e?.response?.data?.message || e?.message || 'Load payroll list failed');
            } finally {
                setLoadingPayrollList(false);
            }
        };
        run();
    }, []);

    // Load payroll detail when select payroll
    useEffect(() => {
        const run = async () => {
            const pid = num(selectedPayrollId);
            setSelectedPayrollDetail(null);
            setSelectedEmployeePayrollId('');
            setDbBreakdown(null);
            setExpected(null);

            if (!pid) return;

            try {
                setLoadingPayrollDetail(true);
                setError('');
                const res = await axios.get(`/api/payroll/${pid}`);
                const body = res?.data;
                const detail = body?.data ?? body;
                setSelectedPayrollDetail(detail || null);

                // auto month
                const m = detail?.month;
                if (m) {
                    const ym = String(m).slice(0, 7);
                    setForm(prev => ({ ...prev, payrollMonth: ym }));
                }
            } catch (e) {
                setError(e?.response?.data?.message || e?.message || 'Load payroll detail failed');
            } finally {
                setLoadingPayrollDetail(false);
            }
        };
        run();
    }, [selectedPayrollId]);

    const employeeOptions = useMemo(() => {
        const eps = selectedPayrollDetail?.employeePayrolls || [];
        return Array.isArray(eps) ? eps : [];
    }, [selectedPayrollDetail]);

    useEffect(() => {
        const run = async () => {
            const epId = num(selectedEmployeePayrollId);
            setDbBreakdown(null);
            setExpected(null);

            setForm(prev => ({
                ...prev,
                employeePayrollId: selectedEmployeePayrollId || prev.employeePayrollId
            }));

            if (!epId) return;

            try {
                setLoadingDb(true);
                setError('');
                const res = await axios.get(`/api/payroll/employee/${epId}/breakdown`);
                const body = res?.data;
                const data = body?.data ?? body;
                setDbBreakdown(data || null);

                const userId = data?.userId;
                const month = data?.payrollMonth ? String(data.payrollMonth).slice(0, 7) : null;

                setForm(prev => ({
                    ...prev,
                    userId: userId != null ? String(userId) : prev.userId,
                    payrollMonth: month || prev.payrollMonth,

                    salaryType: data?.salaryType || prev.salaryType,

                    baseSalary: data?.baseSalary != null ? String(data.baseSalary) : prev.baseSalary,
                    standardWorkingDays: data?.standardWorkingDays != null ? String(data.standardWorkingDays) : prev.standardWorkingDays,
                    actualWorkingDays: data?.actualWorkingDays != null ? String(data.actualWorkingDays) : prev.actualWorkingDays,

                    lateCount: data?.lateCount != null ? String(data.lateCount) : prev.lateCount,

                    ot1Hours: data?.ot1Hours != null ? String(data.ot1Hours) : prev.ot1Hours,
                    ot2Hours: data?.ot2Hours != null ? String(data.ot2Hours) : prev.ot2Hours,

                    productCount: data?.productCount != null ? String(data.productCount) : prev.productCount,
                    unitPrice: data?.unitPrice != null ? String(data.unitPrice) : prev.unitPrice,

                    allowance: data?.allowance != null ? String(data.allowance) : prev.allowance,

                    overridePersonalDeduction: data?.personalDeduction != null ? String(data.personalDeduction) : prev.overridePersonalDeduction,
                    overrideDependentDeduction: data?.dependentDeduction != null ? String(data.dependentDeduction) : prev.overrideDependentDeduction
                }));
            } catch (e) {
                setError(e?.response?.data?.message || e?.message || 'Load DB breakdown failed');
            } finally {
                setLoadingDb(false);
            }
        };
        run();
    }, [selectedEmployeePayrollId]);

    const payrollMonthDate = useMemo(() => {
        if (!form.payrollMonth) return null;
        return `${form.payrollMonth}-01`;
    }, [form.payrollMonth]);

    const reconcilePayload = useMemo(() => ({
        userId: num(form.userId),
        employeePayrollId: num(form.employeePayrollId),
        payrollMonth: payrollMonthDate,

        salaryType: form.salaryType || null,

        baseSalary: form.baseSalary === '' ? null : num(form.baseSalary),
        wageCoefficient: null,

        standardWorkingDays: form.standardWorkingDays === '' ? null : num(form.standardWorkingDays),
        actualWorkingDays: form.actualWorkingDays === '' ? null : num(form.actualWorkingDays),

        lateCount: form.lateCount === '' ? null : num(form.lateCount),
        latePenaltyPerTime: form.latePenaltyPerTime === '' ? null : num(form.latePenaltyPerTime),

        ot1Hours: form.ot1Hours === '' ? null : num(form.ot1Hours),
        ot2Hours: form.ot2Hours === '' ? null : num(form.ot2Hours),

        productCount: form.productCount === '' ? null : num(form.productCount),
        unitPrice: form.unitPrice === '' ? null : num(form.unitPrice),

        allowance: form.allowance === '' ? null : num(form.allowance),

        overridePersonalDeduction: form.overridePersonalDeduction === '' ? null : num(form.overridePersonalDeduction),
        overrideDependentDeduction: form.overrideDependentDeduction === '' ? null : num(form.overrideDependentDeduction)

    }), [form, payrollMonthDate]);

    const computeExpected = async () => {
        setError('');
        setExpected(null);

        if (!reconcilePayload.userId || !reconcilePayload.payrollMonth) return;

        try {
            setLoadingExpected(true);
            const res = await axios.post('/api/payroll/reconcile/compute', reconcilePayload);
            const body = res?.data;
            setExpected(body?.data ?? null);
        } catch (e) {
            setError(e?.response?.data?.message || e?.message || 'Compute reconcile failed');
        } finally {
            setLoadingExpected(false);
        }
    };

    const compareRows = useMemo(() => {
        const fields = [
            ['timeSalary', 'Time Salary'],
            ['productBonus', 'Product Bonus'],
            ['overtimePay', 'Overtime Pay'],
            ['grossIncomeForTax', 'Gross Income (Tax)'],
            ['insurance', 'Insurance (cash)'],
            ['totalDeduction', 'Total Deduction (cash)'],
            ['personalDeduction', 'Personal Deduction (override/actual)'],
            ['dependentDeduction', 'Dependent Deduction (override/actual)'],
            ['taxDeductionTotal', 'Tax Deduction Total (from tax engine)'],
            ['personalIncomeTax', 'PIT'],
            ['allowance', 'Allowance (after tax)'],
            ['totalPay', 'Total Pay (NET)']
        ];

        return fields.map(([key, label]) => {
            const dbVal = dbBreakdown ? dbBreakdown[key] : null;
            const exVal = expected ? expected[key] : null;
            const diff = (dbVal != null && exVal != null) ? Number(exVal) - Number(dbVal) : null;
            return { key, label, dbVal, exVal, diff };
        });
    }, [dbBreakdown, expected]);

    const exportJson = () => {
        downloadJson(
            `payroll-reconcile-${form.userId || 'user'}-${form.payrollMonth || 'month'}.json`,
            {
                generatedAt: new Date().toISOString(),
                selectedPayrollId: num(selectedPayrollId),
                selectedEmployeePayrollId: num(selectedEmployeePayrollId),
                request: reconcilePayload,
                db: dbBreakdown,
                expected,
                compare: compareRows
            }
        );
    };

    return (
        <div className="p-4">
            <h3>Payroll Reconcile Tool</h3>
            <div className="text-muted mb-3">
                Allowance  · Insurance(cash) = grossIncomeForTax × insuranceRate(from Tax Profile) · attendance empty = 0
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}

            <Card className="mb-3">
                <Card.Header className="bg-light fw-bold">A) Load Payroll / DB</Card.Header>
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Payroll List</Form.Label>
                                <Form.Select
                                    value={selectedPayrollId}
                                    onChange={(e) => setSelectedPayrollId(e.target.value)}
                                    disabled={loadingPayrollList}
                                >
                                    <option value="">
                                        {loadingPayrollList ? 'Loading payrolls...' : '-- Select payroll --'}
                                    </option>
                                    {payrollList.map(p => (
                                        <option key={p.id} value={p.id}>
                                            #{p.id} — {String(p.month || '').slice(0, 7)} — {p.department?.name || p.departmentName || 'N/A'}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Employee in Payroll</Form.Label>
                                <Form.Select
                                    value={selectedEmployeePayrollId}
                                    onChange={(e) => setSelectedEmployeePayrollId(e.target.value)}
                                    disabled={!selectedPayrollDetail || loadingPayrollDetail}
                                >
                                    <option value="">
                                        {loadingPayrollDetail ? 'Loading payroll detail...' : '-- Select employee payroll --'}
                                    </option>
                                    {employeeOptions.map(ep => (
                                        <option key={ep.employeePayrollId || ep.id} value={ep.employeePayrollId || ep.id}>
                                            EP#{ep.employeePayrollId || ep.id} — {ep.fullName || ep.user?.fullName || 'N/A'} (User#{ep.userId || ep.user?.id || 'N/A'})
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={12} className="d-flex gap-2 justify-content-end">
                            <Button variant="success" onClick={exportJson} disabled={!dbBreakdown && !expected}>
                                Export JSON
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="mb-3">
                <Card.Header className="bg-light fw-bold">B) Manual Inputs (for Reconcile)</Card.Header>
                <Card.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>User ID</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.userId}
                                    onChange={(e) => setForm(prev => ({ ...prev, userId: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>EmployeePayroll ID (optional)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.employeePayrollId}
                                    onChange={(e) => setForm(prev => ({ ...prev, employeePayrollId: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Month</Form.Label>
                                <Form.Control
                                    type="month"
                                    value={form.payrollMonth}
                                    onChange={(e) => setForm(prev => ({ ...prev, payrollMonth: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Salary Type (optional)</Form.Label>
                                <Form.Select
                                    value={form.salaryType}
                                    onChange={(e) => setForm(prev => ({ ...prev, salaryType: e.target.value }))}
                                >
                                    <option value="">(use from user)</option>
                                    <option value="TimeBased">TimeBased</option>
                                    <option value="ProductBased">ProductBased</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Base Salary</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.baseSalary}
                                    onChange={(e) => setForm(prev => ({ ...prev, baseSalary: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Standard Days</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={form.standardWorkingDays}
                                    onChange={(e) => setForm(prev => ({ ...prev, standardWorkingDays: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Actual Days (default 0)</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={form.actualWorkingDays}
                                    onChange={(e) => setForm(prev => ({ ...prev, actualWorkingDays: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>OT1 Hours</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={form.ot1Hours}
                                    onChange={(e) => setForm(prev => ({ ...prev, ot1Hours: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>OT2 Hours</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.5"
                                    value={form.ot2Hours}
                                    onChange={(e) => setForm(prev => ({ ...prev, ot2Hours: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Late Count</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.lateCount}
                                    onChange={(e) => setForm(prev => ({ ...prev, lateCount: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Late Penalty / time</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.latePenaltyPerTime}
                                    onChange={(e) => setForm(prev => ({ ...prev, latePenaltyPerTime: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Allowance (after tax)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.allowance}
                                    onChange={(e) => setForm(prev => ({ ...prev, allowance: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Product Count</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.productCount}
                                    onChange={(e) => setForm(prev => ({ ...prev, productCount: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Unit Price</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.unitPrice}
                                    onChange={(e) => setForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>

                        {/* Tax overrides */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Personal Deduction (override, VND)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.overridePersonalDeduction}
                                    onChange={(e) => setForm(prev => ({ ...prev, overridePersonalDeduction: e.target.value }))}
                                    placeholder="VD: 15500000"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Dependent Deduction (override total, VND)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={form.overrideDependentDeduction}
                                    onChange={(e) => setForm(prev => ({ ...prev, overrideDependentDeduction: e.target.value }))}
                                    placeholder="VD: 6200000"
                                />
                            </Form.Group>
                        </Col>

                        <Col md={12} className="d-flex gap-2 justify-content-end">
                            <Button variant="primary" onClick={computeExpected} disabled={loadingExpected}>
                                {loadingExpected ? <Spinner size="sm" /> : 'Compute Expected'}
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="mt-3">
                <Card.Header className="bg-light fw-bold">C) Compare</Card.Header>
                <Card.Body>
                    <div style={{ overflowX: 'auto' }}>
                        <Table bordered hover size="sm" className="mb-0">
                            <thead>
                            <tr>
                                <th>Field</th>
                                <th className="text-end">DB</th>
                                <th className="text-end">Expected</th>
                                <th className="text-end">Diff</th>
                            </tr>
                            </thead>
                            <tbody>
                            {compareRows.map(r => (
                                <tr key={r.key} className={r.diff != null && Math.abs(r.diff) > 0 ? 'table-warning' : ''}>
                                    <td>{r.label}</td>
                                    <td className="text-end">{fmt(r.dbVal)}</td>
                                    <td className="text-end">{fmt(r.exVal)}</td>
                                    <td className="text-end">{r.diff == null ? '' : fmt(r.diff)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    </div>
                </Card.Body>
            </Card>

            <Row className="g-3">
                <Col md={6}>
                    <Card>
                        <Card.Header className="bg-light fw-bold">D) DB Breakdown</Card.Header>
                        <Card.Body>
                            {loadingDb ? <Spinner /> : (!dbBreakdown ? <div className="text-muted">Not yet loaded.</div> : (
                                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(dbBreakdown, null, 2)}</pre>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={6}>
                    <Card>
                        <Card.Header className="bg-light fw-bold">E) Expected</Card.Header>
                        <Card.Body>
                            {!expected ? <div className="text-muted">Not yet computed.</div> : (
                                <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(expected, null, 2)}</pre>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}