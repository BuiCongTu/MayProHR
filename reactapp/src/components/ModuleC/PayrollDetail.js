import { useEffect, useMemo, useRef, useState } from 'react';
import
{
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Pagination,
  Row,
  Spinner,
  Tab,
  Table,
  Tabs
} from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import payrollService from '../../services/moduleC/payrollService';
import { getCurrentUser } from '../../services/authService';

const isFactoryManagerRole = (roleName) =>
{
  const normalized = String(roleName || '')
    .toLowerCase()
    .replace(/\s+/g, '');
  return normalized === 'factorymanager' || normalized === 'fmanager';
};

const toISODateFirstOfMonth = (yyyyMMOrIso) =>
{
  if (!yyyyMMOrIso) return null;

  // If already ISO date like 2025-12-01
  if (/^\d{4}-\d{2}-\d{2}$/.test(yyyyMMOrIso))
  {
    return yyyyMMOrIso.substring(0, 7) + '-01';
  }

  // If YYYY-MM
  if (/^\d{4}-\d{2}$/.test(yyyyMMOrIso))
  {
    return `${yyyyMMOrIso}-01`;
  }

  const d = new Date(yyyyMMOrIso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}-01`;
};

const formatCurrency = (value) =>
{
  const v = value ?? 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(v);
};

const formatMonth = (monthStr) =>
{
  if (!monthStr) return '';
  return new Date(monthStr).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};

const PayrollDetail = () =>
{
  const { payrollId } = useParams();
  const navigate = useNavigate();

  const roleName = getCurrentUser()?.roleName;
  const isFactoryManager = isFactoryManagerRole(roleName);

  const [payroll, setPayroll] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto calculate all in payroll
  const [autoCalcRunning, setAutoCalcRunning] = useState(false);
  const [autoCalcProgress, setAutoCalcProgress] = useState({ done: 0, total: 0 });

  // --- Employee list UX: search / sort / pagination ---
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | draft | pending | calculated | confirmed | approved | rejected
  const [empPage, setEmpPage] = useState(1);
  const [empPageSize, setEmpPageSize] = useState(10);

  // Modal (calculator-style preview)
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // DB breakdown for accurate modal prefill
  const [dbBreakdown, setDbBreakdown] = useState(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');

  // Prevent DB prefill from overwriting user edits
  const [calcFormTouched, setCalcFormTouched] = useState(false);
  const calcFormTouchedRef = useRef(false);

  const [calcTab, setCalcTab] = useState('input');
  const [calcForm, setCalcForm] = useState({
    allowance: 0,
    note: '',
    overrideActualWorkingDays: '',
    overrideOtWeekdayHours: '',
    overrideOtHolidayHours: '',
    overrideProductCount: '',
    overrideUnitPrice: ''
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const markCalcFormTouched = () =>
  {
    if (!calcFormTouchedRef.current)
    {
      calcFormTouchedRef.current = true;
      setCalcFormTouched(true);
    }
  };

  const buildCalcFormFromBreakdown = (breakdown, fallbackEmp) =>
  {
    const actualDays = breakdown?.actualWorkingDays ?? fallbackEmp?.actualWorkingDays ?? '';
    const ot1 = breakdown?.otWeekdayHours ?? breakdown?.ot1Hours ?? fallbackEmp?.otWeekdayHours ?? fallbackEmp?.ot1Hours ?? '';
    const ot2 = breakdown?.otHolidayHours ?? breakdown?.ot2Hours ?? fallbackEmp?.otHolidayHours ?? fallbackEmp?.ot2Hours ?? '';
    const productCount = breakdown?.productCount ?? fallbackEmp?.productCount ?? '';
    const unitPrice = breakdown?.unitPrice ?? fallbackEmp?.unitPrice ?? '';

    return {
      allowance: breakdown?.allowance ?? fallbackEmp?.allowance ?? 0,
      note: breakdown?.note ?? fallbackEmp?.note ?? '',

      overrideActualWorkingDays: actualDays,
      overrideOtWeekdayHours: ot1,
      overrideOtHolidayHours: ot2,
      overrideProductCount: productCount,
      overrideUnitPrice: unitPrice
    };
  };

  useEffect(() =>
  {
    const employeePayrollId = selectedEmployee?.employeePayrollId;
    if (!showModal || !employeePayrollId) return;

    let cancelled = false;

    const loadBreakdown = async () =>
    {
      try
      {
        setBreakdownLoading(true);
        setBreakdownError('');
        setDbBreakdown(null);

        const data = await payrollService.getPayrollBreakdown(employeePayrollId);
        if (cancelled) return;

        setDbBreakdown(data);

        // Only prefill if user hasn't started editing
        if (!calcFormTouchedRef.current)
        {
          setCalcForm(buildCalcFormFromBreakdown(data, selectedEmployee));
        }
      } catch (err)
      {
        if (cancelled) return;
        console.error('Error loading employee payroll breakdown:', err);
        setBreakdownError(err?.response?.data?.message || err?.message || 'Cannot load breakdown from database');
      } finally
      {
        if (!cancelled) setBreakdownLoading(false);
      }
    };

    loadBreakdown();
    return () =>
    {
      cancelled = true;
    };
  }, [showModal, selectedEmployee?.employeePayrollId]);

  useEffect(() =>
  {
    if (payrollId)
    {
      fetchPayrollDetail(payrollId);
    }
  }, [payrollId]);

  const fetchPayrollDetail = async (id) =>
  {
    try
    {
      setLoading(true);
      setError('');

      const response = await payrollService.getPayrollDetail(id);
      const data = response?.data || response;
      setPayroll(data);
    } catch (err)
    {
      console.error('Error load payroll detail:', err);
      setError(err?.response?.data?.message || err?.message || 'Cannot load payroll detail. Please try again later.');
    } finally
    {
      setLoading(false);
    }
  };

  const statusVariant = (status) =>
  {
    if (!status) return 'secondary';
    switch (String(status).toLowerCase())
    {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status) => status || 'N/A';

  const getStatusBadge = (status) =>
  {
    const value = String(status || '').toLowerCase();
    switch (value)
    {
      case 'confirmed':
        return 'success';
      case 'calculated':
        return 'primary';
      case 'pending':
        return 'warning';
      case 'draft':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleAutoCalcuAll = async () =>
  {
    if (!payrollId) return;

    const confirmed = window.confirm('Are you sure you want to Auto Calculate payroll for ALL employees in this payroll? This action may take several minutes.');
    if (!confirmed) return;

    try
    {
      setError('');
      setAutoCalcRunning(true);
      setAutoCalcProgress({ done: 0, total: 0 });

      const result = await payrollService.recalculateAllEmployeesInPayroll(Number(payrollId), {
        concurrency: 4,
        onProgress: ({ done, total }) => setAutoCalcProgress({ done, total })
      });

      await fetchPayrollDetail(payrollId);

      if (result?.failed > 0)
      {
        toast.error(`Auto Calcu All done but ${result.failed}/${result.total} employees failed.`);
      } else
      {
        toast.success('Auto Calcu All completed successfully for all employees.');
      }
    } catch (err)
    {
      console.error('Auto Calcu All error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Auto Calcu All failed');
    } finally
    {
      setAutoCalcRunning(false);
    }
  };

  const handleRowClick = (emp) =>
  {
    setSelectedEmployee(emp);
    setCalcTab('input');
    setPreview(null);

    // Reset DB prefill state for this modal open
    setDbBreakdown(null);
    setBreakdownError('');
    setBreakdownLoading(false);
    calcFormTouchedRef.current = false;
    setCalcFormTouched(false);

    const actualDays = emp?.actualWorkingDays ?? '';
    const ot1 = emp?.otWeekdayHours ?? emp?.ot1Hours ?? '';
    const ot2 = emp?.otHolidayHours ?? emp?.ot2Hours ?? '';
    const productCount = emp?.productCount ?? '';
    const unitPrice = emp?.unitPrice ?? '';

    // Fallback prefill from list row; DB breakdown (loaded async) will replace if user hasn't edited.
    setCalcForm(buildCalcFormFromBreakdown(null, emp));

    setShowModal(true);
  };


  const handleCloseModal = () =>
  {
    setShowModal(false);
    setSelectedEmployee(null);
    setDbBreakdown(null);
    setBreakdownError('');
    setBreakdownLoading(false);
    calcFormTouchedRef.current = false;
    setCalcFormTouched(false);
    setPreview(null);
    setLoadingPreview(false);
    setCalcTab('input');
  };

  const previewPayload = useMemo(() =>
  {
    if (!selectedEmployee || !payroll) return null;

    return {
      payrollId: payrollId ? Number(payrollId) : null,
      userId: selectedEmployee.userId ? Number(selectedEmployee.userId) : null,
      month: toISODateFirstOfMonth(payroll.month),

      allowance: calcForm.allowance === '' ? 0 : Number(calcForm.allowance || 0),
      note: calcForm.note || null,

      overrideActualWorkingDays: calcForm.overrideActualWorkingDays === '' ? null : Number(calcForm.overrideActualWorkingDays),
      overrideOtWeekdayHours: calcForm.overrideOtWeekdayHours === '' ? null : Number(calcForm.overrideOtWeekdayHours),
      overrideOtHolidayHours: calcForm.overrideOtHolidayHours === '' ? null : Number(calcForm.overrideOtHolidayHours),
      overrideProductCount: calcForm.overrideProductCount === '' ? null : Number(calcForm.overrideProductCount),
      overrideUnitPrice: calcForm.overrideUnitPrice === '' ? null : Number(calcForm.overrideUnitPrice)
    };
  }, [selectedEmployee, payroll, payrollId, calcForm]);

  const handlePreview = async () =>
  {
    if (!previewPayload?.userId || !previewPayload?.month)
    {
      toast.error('userId Null or month for preview');
      return;
    }

    try
    {
      setLoadingPreview(true);
      const data = await payrollService.previewEmployeePayroll(previewPayload);
      setPreview(data);
      setCalcTab('result');
    } catch (err)
    {
      console.error('Preview error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Preview calculation failed');
      return null;
    } finally
    {
      setLoadingPreview(false);
    }
  };
  const handleConfirmAndSave = async () =>
  {
    if (!previewPayload?.payrollId || !previewPayload?.userId || !previewPayload?.month)
    {
      toast.error('payrollId/userId/month not null');
      return;
    }

    try
    {
      setSaving(true);

      // Nếu chưa preview thì preview trước để user thấy đúng số liệu
      const ensuredPreview = preview || (await handlePreview());
      if (!ensuredPreview)
      {
        setSaving(false);
        return;
      }

      await payrollService.confirmEmployeePayroll(previewPayload);

      toast.success('Confirm & Save succsessfully');
      await fetchPayrollDetail(payrollId);
      handleCloseModal();
    } catch (err)
    {
      console.error('Confirm & Save error:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Confirm & Save failed');
    } finally
    {
      setSaving(false);
    }
  };


  const employees = payroll?.employeePayrolls || [];

  // Sorting by status (business order) + direction
  const statusSortRank = (status) =>
  {
    const s = String(status || '').toLowerCase();
    // Workflow order: draft -> pending -> calculated -> confirmed -> approved -> rejected -> others
    if (s === 'draft') return 1;
    if (s === 'pending') return 2;
    if (s === 'calculated') return 3;
    if (s === 'confirmed') return 4;
    if (s === 'approved') return 5;
    if (s === 'rejected') return 6;
    return 99;
  };

  const filteredEmployees = useMemo(() =>
  {
    const q = String(searchName || '').trim().toLowerCase();
    const statusQ = String(statusFilter || 'all').toLowerCase();

    return employees.filter(e =>
    {
      const matchesName = !q || String(e?.fullName || '').toLowerCase().includes(q);
      if (!matchesName) return false;

      if (!statusQ || statusQ === 'all') return true;
      return String(e?.calculationStatus || '').toLowerCase() === statusQ;
    });
  }, [employees, searchName, statusFilter]);

  const sortedEmployees = useMemo(() =>
  {
    const arr = [...filteredEmployees];
    arr.sort((a, b) =>
    {
      const ra = statusSortRank(a?.calculationStatus);
      const rb = statusSortRank(b?.calculationStatus);
      if (ra !== rb) return ra - rb;

      const na = String(a?.fullName || '').toLowerCase();
      const nb = String(b?.fullName || '').toLowerCase();
      return na.localeCompare(nb);
    });
    return arr;
  }, [filteredEmployees]);

  const totalEmpPages = Math.max(1, Math.ceil(sortedEmployees.length / empPageSize));

  const paginatedEmployees = useMemo(() =>
  {
    const start = (empPage - 1) * empPageSize;
    return sortedEmployees.slice(start, start + empPageSize);
  }, [sortedEmployees, empPage, empPageSize]);

  useEffect(() =>
  {
    setEmpPage(1);
  }, [searchName, statusFilter, empPageSize, payrollId]);

  const totalNetPay = employees.reduce((sum, e) => sum + (Number(e.totalPay) || 0), 0);

  if (loading)
  {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error)
  {
    return (
      <div className="p-4">
        <Button variant="link" onClick={() => navigate(-1)}>← Back</Button>
        <p className="text-danger mt-3">{error}</p>
      </div>
    );
  }

  if (!payroll)
  {
    return null;
  }

  return (
    <div className="p-4 payroll-detail-container">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3>Payroll Details</h3>
          <small className="text-muted">
            Department: {payroll.departmentName || payroll.department?.name || 'N/A'} | Month: {formatMonth(payroll.month)}
          </small>
        </div>

        <div className="d-flex gap-2">
          <Badge bg={statusVariant(payroll.status)}>
            {payroll.status || 'N/A'}
          </Badge>

          <Button
            variant="primary"
            onClick={() => navigate(`/payroll/${payrollId}/calculate`)}
            disabled={autoCalcRunning || isFactoryManager}
            title={isFactoryManager ? 'Factory Manager is not allowed to calculate payroll.' : undefined}
          >
            Calculate Payroll
          </Button>

          <Button
            variant="warning"
            onClick={handleAutoCalcuAll}
            disabled={autoCalcRunning || isFactoryManager}
            title={isFactoryManager ? 'Factory Manager is not allowed to auto calculate payroll.' : undefined}
          >
            {autoCalcRunning
              ? `Auto Calcu All... ${autoCalcProgress.done}/${autoCalcProgress.total || '?'}`
              : 'Auto Calcu All'}
          </Button>

          <Button
            variant="outline-secondary"
            onClick={() => navigate(-1)}
            disabled={autoCalcRunning}
          >
            Back to Payroll List
          </Button>
        </div>
      </div>

      {autoCalcRunning && (
        <Alert variant="info">
          Auto Calculate... {autoCalcProgress.done}/{autoCalcProgress.total || '?'}
        </Alert>
      )}

      {isFactoryManager && (
        <Alert variant="warning" className="mb-3">
          Factory Manager role: payroll calculation features are locked. Please use <strong>Reconcile Tool</strong>.
        </Alert>
      )}

      <Row className="mb-4">
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6>Total Salary</h6>
              <h4>{formatCurrency(payroll.totalSalary)}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6>Employees</h6>
              <h4>{employees.length}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="shadow-sm">
            <Card.Body>
              <h6>Total Net (per employee)</h6>
              <h4>{formatCurrency(totalNetPay)}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Employee Payroll List</h6>

          <div className="d-flex gap-2 align-items-center">
            <Form.Control
              size="sm"
              style={{ width: 220 }}
              placeholder="Search full name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              disabled={autoCalcRunning}
            />

            <Form.Select
              size="sm"
              style={{ width: 180 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              disabled={autoCalcRunning}
            >
              <option value="all">All</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="calculated">Calculated</option>
              <option value="confirmed">Confirmed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </Form.Select>

            <Form.Select
              size="sm"
              style={{ width: 130 }}
              value={empPageSize}
              onChange={(e) => setEmpPageSize(Number(e.target.value))}
              disabled={autoCalcRunning}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {employees.length === 0 ? (
            <div className="p-3 text-muted">No employee data.</div>
          ) : paginatedEmployees.length === 0 ? (
            <div className="p-3 text-muted">No employees match your search.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Status</th>

                    <th className="text-end">Actual Days</th>
                    <th className="text-end">OT1</th>
                    <th className="text-end">OT2</th>
                    <th className="text-end">Allowance</th>

                    <th className="text-end">Gross (Tax)</th>
                    <th className="text-end text-danger">Cash Deduction</th>
                    <th className="text-end text-danger">Personal Income Tax</th>
                    <th className="text-end text-bg-primary">Net Pay</th>

                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedEmployees.map(emp => (
                    <tr
                      key={emp.employeePayrollId || emp.employeeCode || emp.userId}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleRowClick(emp)}
                    >
                      <td><strong>{emp.employeeCode ?? emp.userId ?? 'N/A'}</strong></td>
                      <td>{emp.fullName || 'N/A'}</td>
                      <td>
                        <Badge bg={getStatusBadge(emp.calculationStatus)}>
                          {getStatusLabel(emp.calculationStatus)}
                        </Badge>
                      </td>

                      <td className="text-end">{emp.actualWorkingDays ?? 0}</td>
                      <td className="text-end">{emp.otWeekdayHours ?? emp.ot1Hours ?? 0}</td>
                      <td className="text-end">{emp.otHolidayHours ?? emp.ot2Hours ?? 0}</td>
                      <td className="text-end">{formatCurrency(emp.allowance)}</td>

                      <td className="text-end">{formatCurrency(emp.grossIncomeForTax)}</td>
                      <td className="text-end text-danger">{formatCurrency(emp.deduction)}</td>
                      <td className="text-end text-danger">{formatCurrency(emp.personalIncomeTax)}</td>
                      <td className="text-end text-bg-primary">
                        <strong>{formatCurrency(emp.totalPay)}</strong>
                      </td>

                      <td onClick={(e) => e.stopPropagation()} className="d-flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isFactoryManager}
                          title={isFactoryManager ? 'Factory Manager is not allowed to calculate payroll.' : undefined}
                          onClick={() =>
                            navigate(`/payroll/${payrollId}/calculate`, {
                              state: { userId: emp.userId, month: payroll.month }
                            })
                          }
                        >
                          Calc
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}

          {sortedEmployees.length > 0 && (
            <div className="d-flex justify-content-between align-items-center px-3 py-2 border-top">
              <div className="text-muted small">
                Showing {(empPage - 1) * empPageSize + 1}–
                {Math.min(empPage * empPageSize, sortedEmployees.length)} of {sortedEmployees.length}
              </div>

              <Pagination className="mb-0">
                <Pagination.First disabled={empPage === 1} onClick={() => setEmpPage(1)} />
                <Pagination.Prev disabled={empPage === 1} onClick={() => setEmpPage(p => Math.max(1, p - 1))} />

                {Array.from({ length: Math.min(5, totalEmpPages) }).map((_, i) =>
                {
                  const start = Math.max(1, empPage - 2);
                  const page = Math.min(totalEmpPages, start + i);
                  return (
                    <Pagination.Item
                      key={page}
                      active={page === empPage}
                      onClick={() => setEmpPage(page)}
                    >
                      {page}
                    </Pagination.Item>
                  );
                })}

                <Pagination.Next disabled={empPage === totalEmpPages} onClick={() => setEmpPage(p => Math.min(totalEmpPages, p + 1))} />
                <Pagination.Last disabled={empPage === totalEmpPages} onClick={() => setEmpPage(totalEmpPages)} />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Calculator Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl" centered backdrop="static">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title>
            Payroll Calculator
            {selectedEmployee
              ? ` — ${selectedEmployee.fullName} (#${selectedEmployee.employeeCode ?? selectedEmployee.userId ?? 'N/A'})`
              : ''}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!selectedEmployee ? null : (
            <>
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <div className="text-muted small">Salary Type</div>
                      <div className="fw-bold">{selectedEmployee.salaryType || 'N/A'}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <div className="text-muted small">Employee Status</div>
                      <div>
                        <Badge bg={getStatusBadge(selectedEmployee.calculationStatus)}>
                          {getStatusLabel(selectedEmployee.calculationStatus)}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="shadow-sm">
                    <Card.Body>
                      <div className="text-muted small">Month</div>
                      <div className="fw-bold">{formatMonth(payroll.month)}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Tabs activeKey={calcTab} onSelect={(k) => setCalcTab(k || 'input')}>
                <Tab eventKey="input" title="Input">
                  <div className="p-3">
                    {breakdownLoading ? (
                      <div className="d-flex align-items-center gap-2 text-muted small mb-3">
                        <Spinner animation="border" size="sm" />
                        Loading breakdown from database...
                      </div>
                    ) : null}

                    {breakdownError ? (
                      <Alert variant="warning" className="py-2 mb-3">
                        {breakdownError}. Using values from the list row.
                      </Alert>
                    ) : null}

                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Allowance (Manual)</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.allowance}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, allowance: e.target.value }));
                            }}
                            min="0"
                            step="1"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Note</Form.Label>
                          <Form.Control
                            value={calcForm.note}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, note: e.target.value }));
                            }}
                            placeholder="Optional note..."
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Override Actual Working Days</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.overrideActualWorkingDays}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, overrideActualWorkingDays: e.target.value }));
                            }}
                            step="0.5"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Override OT Weekday Hours (OT1)</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.overrideOtWeekdayHours}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, overrideOtWeekdayHours: e.target.value }));
                            }}
                            step="0.5"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group>
                          <Form.Label>Override OT Holiday Hours (OT2)</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.overrideOtHolidayHours}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, overrideOtHolidayHours: e.target.value }));
                            }}
                            step="0.5"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Override Product Count (ProductBased)</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.overrideProductCount}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, overrideProductCount: e.target.value }));
                            }}
                            step="1"
                            min="0"
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Override Unit Price (ProductBased)</Form.Label>
                          <Form.Control
                            type="number"
                            value={calcForm.overrideUnitPrice}
                            onChange={(e) =>
                            {
                              markCalcFormTouched();
                              setCalcForm(prev => ({ ...prev, overrideUnitPrice: e.target.value }));
                            }}
                            step="1"
                            min="0"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <div className="d-flex justify-content-end mt-3 gap-2">
                      <Button variant="secondary" onClick={handleCloseModal} disabled={loadingPreview || saving}>
                        Close
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handlePreview}
                        disabled={loadingPreview || saving || isFactoryManager}
                        title={isFactoryManager ? 'Factory Manager is not allowed to preview/recalculate payroll.' : undefined}
                      >
                        {loadingPreview ? 'Calculating...' : 'Recalculate (Preview)'}
                      </Button>
                    </div>
                  </div>
                </Tab>

                <Tab eventKey="result" title="Result">
                  <div className="p-3">
                    {!preview ? (
                      <Alert variant="info" className="mb-0">
                        No Data for Review, press <strong>Recalculate (Preview)</strong> OR <strong>Confirm & Save</strong>
                      </Alert>
                    ) : (
                      <>
                        <Card className="shadow-sm">
                          <Card.Header className="bg-light fw-bold">
                            Payroll Breakdown
                          </Card.Header>
                          <Card.Body>
                            {(() =>
                            {
                              const lateCount = Number(preview?.lateCount ?? 0);
                              const latePenaltyPerTime = Number(preview?.latePenalty ?? 0);
                              const latePenaltyTotal = lateCount * latePenaltyPerTime;

                              const insurance = Number(preview?.insurance ?? 0);
                              const cashDeductionTotal = latePenaltyTotal + insurance;

                              const gross = Number(preview?.grossIncomeForTax ?? 0);
                              const incomeAfterCash = gross - cashDeductionTotal;

                              return (
                                <Table bordered responsive size="sm" className="mb-0">
                                  <tbody>
                                    <tr>
                                      <td>Base Salary</td>
                                      <td className="text-end">{formatCurrency(preview.baseSalary)}</td>
                                    </tr>

                                    <tr>
                                      <td>Time Salary (A)</td>
                                      <td className="text-end">{formatCurrency(preview.timeSalary)}</td>
                                    </tr>

                                    <tr>
                                      <td>Product Bonus (B)</td>
                                      <td className="text-end">{formatCurrency(preview.productBonus)}</td>
                                    </tr>

                                    <tr>
                                      <td>Overtime Pay (C)</td>
                                      <td className="text-end">{formatCurrency(preview.overtimePay)}</td>
                                    </tr>

                                    <tr>
                                      <td><strong>Gross income for tax (D = A+B+C)</strong></td>
                                      <td className="text-end">
                                        <strong>{formatCurrency(preview.grossIncomeForTax)}</strong>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td><strong>Cash deductions</strong></td>
                                      <td></td>
                                    </tr>

                                    <tr>
                                      <td>Late Count (E)</td>
                                      <td className="text-end">{lateCount}</td>
                                    </tr>

                                    <tr>
                                      <td>Late Penalty / time (F)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.latePenalty)}</td>
                                    </tr>

                                    <tr>
                                      <td>Late Penalty Total (G = ExF)</td>
                                      <td className="text-end text-danger">-{formatCurrency(latePenaltyTotal)}</td>
                                    </tr>

                                    <tr>
                                      <td>Insurance (H)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.insurance)}</td>
                                    </tr>

                                    <tr>
                                      <td><strong>Cash Deduction Total (I = G+H)</strong></td>
                                      <td className="text-end text-danger">
                                        <strong>-{formatCurrency(cashDeductionTotal)}</strong>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td><strong>Income after cash deductions (J = D+I)</strong></td>
                                      <td className="text-end">
                                        <strong>{formatCurrency(incomeAfterCash)}</strong>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td><strong>Tax deductions (from tax engine)</strong></td>
                                      <td></td>
                                    </tr>

                                    <tr>
                                      <td>Personal Deduction (K)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.personalDeduction)}</td>
                                    </tr>

                                    <tr>
                                      <td>Dependent Deduction (L)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.dependentDeduction)}</td>
                                    </tr>

                                    <tr>
                                      <td>Insurance Deduction (M - for tax)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.insuranceDeduction)}</td>
                                    </tr>

                                    <tr>
                                      <td><strong>Total Tax Deduction (N = K+L+M</strong></td>
                                      <td className="text-end text-danger">
                                        <strong>-{formatCurrency(preview.taxDeductionTotal)}</strong>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td><strong>Taxable Income (from tax engine) Q = J-N</strong></td>
                                      <td className="text-end">
                                        <strong>{formatCurrency(preview.taxableIncome)}</strong>
                                      </td>
                                    </tr>

                                    <tr>
                                      <td>Personal Income Tax (PIT) R = Q × (Tax Bracket)</td>
                                      <td className="text-end text-danger">-{formatCurrency(preview.personalIncomeTax)}</td>
                                    </tr>

                                    <tr>
                                      <td>Allowance (Total) S</td>
                                      <td className="text-end">{formatCurrency(preview.allowance)}</td>
                                    </tr>

                                    <tr className="table-success">
                                      <td><strong>Total Pay (NET) T = J-R+S</strong></td>
                                      <td className="text-end">
                                        <strong>{formatCurrency(preview.totalPay)}</strong>
                                      </td>
                                    </tr>
                                  </tbody>
                                </Table>
                              );
                            })()}

                            {preview?.taxCalculation?.note ? (
                              <Alert variant="secondary" className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                <strong>Tax calculation details:</strong>
                                {'\n\n'}
                                {preview.taxCalculation.note}
                              </Alert>
                            ) : null}
                          </Card.Body>
                        </Card>


                        <div className="d-flex justify-content-end mt-3 gap-2">
                          <Button variant="secondary" onClick={() => setCalcTab('input')} disabled={saving}>
                            Back to Input
                          </Button>

                          <Button
                            variant="success"
                            onClick={handleConfirmAndSave}
                            disabled={saving || loadingPreview || isFactoryManager}
                            title={isFactoryManager ? 'Factory Manager is not allowed to confirm/save payroll calculation.' : undefined}
                          >
                            {saving ? 'Saving...' : 'Confirm & Save'}
                          </Button>

                          <Button variant="outline-secondary" onClick={handleCloseModal} disabled={saving}>
                            Close
                          </Button>
                        </div>
                      </>
                    )}

                    {/* Nếu chưa preview, vẫn cho nút save để auto preview */}
                    {!preview ? (
                      <div className="d-flex justify-content-end mt-3 gap-2">
                        <Button variant="secondary" onClick={() => setCalcTab('input')} disabled={saving}>
                          Back to Input
                        </Button>
                        <Button
                          variant="success"
                          onClick={handleConfirmAndSave}
                          disabled={saving || loadingPreview || isFactoryManager}
                          title={isFactoryManager ? 'Factory Manager is not allowed to confirm/save payroll calculation.' : undefined}
                        >
                          {saving ? 'Saving...' : 'Confirm & Save'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Tab>
              </Tabs>
            </>
          )}
        </Modal.Body>

      </Modal>
    </div>
  );
};

export default PayrollDetail;
