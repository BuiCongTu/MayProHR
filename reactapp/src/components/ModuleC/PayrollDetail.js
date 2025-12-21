import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Col, Modal, Row, Spinner, Table, Badge } from 'react-bootstrap';
import payrollService from '../../services/moduleC/payrollService';
import { toast } from 'react-toastify';

const PayrollDetail = () =>
{
    const { payrollId } = useParams();
    const navigate = useNavigate();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        actualWorkingDays: 0,
        paidLeaveDays: 0,
        unpaidLeaveDays: 0,
        otWeekdayHours: 0,
        otHolidayHours: 0
    });

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
            setError(err.response?.data?.message || 'Cannot load payroll detail. Please try again later.');
        } finally
        {
            setLoading(false);
        }
    };

    const formatCurrency = (value) =>
    {
        if (!value) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatMonth = (monthStr) =>
    {
        if (!monthStr) return '';
        return new Date(monthStr).toLocaleDateString('vi-VN', {
            month: 'long',
            year: 'numeric'
        });
    };

    const handleRowClick = (emp) =>
    {
        setSelectedEmployee(emp);
        setFormData({
            actualWorkingDays: emp.actualWorkingDays || emp.totalWorkDays || 0,
            paidLeaveDays: emp.paidLeaveDays || 0,
            unpaidLeaveDays: emp.unpaidLeaveDays || 0,
            otWeekdayHours: emp.otWeekdayHours || 0,
            otHolidayHours: emp.otHolidayHours || 0
        });
        setEditMode(false);
        setShowModal(true);
    };

    const handleCloseModal = () =>
    {
        setShowModal(false);
        setSelectedEmployee(null);
        setEditMode(false);
        setFormData({
            actualWorkingDays: 0,
            paidLeaveDays: 0,
            unpaidLeaveDays: 0,
            otWeekdayHours: 0,
            otHolidayHours: 0
        });
    };

    const handleEdit = () =>
    {
        setEditMode(true);
        setError('');
    };

    const handleSave = async () => {
        try {
            const response = await payrollService.updateEmployeeWorkData(
                selectedEmployee.employeePayrollId,
                formData
            );
            setSelectedEmployee({ ...selectedEmployee, ...formData });
            setEditMode(false);
            setShowModal(false);
            toast.success('Changes saved successfully!');
        } catch (err) {
            setError(err?.message || 'Failed to save changes');
            toast.error(err?.message || 'Failed to save changes');
        }
    };

    const handleCancel = () =>
    {
        setEditMode(false);
        setFormData({
            actualWorkingDays: selectedEmployee?.actualWorkingDays || selectedEmployee?.totalWorkDays || 0,
            paidLeaveDays: selectedEmployee?.paidLeaveDays || 0,
            unpaidLeaveDays: selectedEmployee?.unpaidLeaveDays || 0,
            otWeekdayHours: selectedEmployee?.otWeekdayHours || 0,
            otHolidayHours: selectedEmployee?.otHolidayHours || 0
        });
    };

    const statusVariant = (status) =>
    {
        if (!status) return 'secondary';
        switch (status.toLowerCase())
        {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'danger';
            default:
                return 'warning';
        }
    };

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

    const employees = payroll.employeePayrolls || [];

    const totalNetPay = employees.reduce(
        (sum, e) => sum + (Number(e.totalPay) || 0),
        0
    );

    return (
        <div className="p-4 payroll-detail-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h3>Payroll Details</h3>
                    <small className="text-muted">
                        Department: {payroll.departmentName || 'N/A'} | Month: {formatMonth(payroll.month)}
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <Badge bg={statusVariant(payroll.status)}>
                        {payroll.status || 'N/A'}
                    </Badge>

                    <Button
                        variant="primary"
                        onClick={() => navigate(`/payroll/${payrollId}/calculate`)}
                    >
                        Calculate Payroll
                    </Button>

                    <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                        Back to Payroll List
                    </Button>
                </div>
            </div>


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
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Employee Payroll List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {employees.length === 0 ? (
                        <div className="p-3 text-muted">No employee data.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                <tr>
                                    <th>Emp ID</th>
                                    <th>Full Name</th>
                                    <th className="text-end">Base Salary</th>
                                    <th className="text-end">Allowance</th>
                                    <th className="text-end">Product Bonus</th>
                                    <th className="text-end">Overtime</th>
                                    <th className="text-end text-danger">Deductions</th>
                                    <th className="text-end text-danger">Personal Income Tax</th>
                                    <th className="text-end text-bg-primary">Net Pay</th>
                                    <th>Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {employees.map(emp => (
                                    <tr
                                        key={emp.employeePayrollId}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleRowClick(emp)}
                                    >
                                        <td><strong>{emp.employeeCode}</strong></td>
                                        <td>{emp.fullName}</td>
                                        <td className="text-end">{formatCurrency(emp.baseSalary)}</td>
                                        <td className="text-end">{formatCurrency(emp.allowance)}</td>
                                        <td className="text-end">{formatCurrency(emp.productBonus)}</td>
                                        <td className="text-end">{formatCurrency(emp.overtimePay)}</td>
                                        <td className="text-end text-danger">{formatCurrency(emp.deduction)}</td>
                                        <td className="text-end text-danger">{formatCurrency(emp.personalIncomeTax)}</td>
                                        <td className="text-end text-bg-primary">
                                            <strong>{formatCurrency(emp.totalPay)}</strong>
                                        </td>
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="primary"
                                                onClick={() =>
                                                    navigate(`/payroll/${payrollId}/calculate`, {
                                                        state: {
                                                            userId: emp.userId,
                                                            month: payroll.month
                                                        }
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
                </Card.Body>
            </Card>

            {/* Modal for single employee details */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Employee Salary Details
                        {selectedEmployee && ` - ${selectedEmployee.fullName} (${selectedEmployee.employeeCode})`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEmployee && (
                        <>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <h6>General Information</h6>
                                    <p><strong>Emp ID:</strong> {selectedEmployee.employeeCode}</p>
                                    <p><strong>Full Name:</strong> {selectedEmployee.fullName}</p>
                                    <p><strong>Salary Type:</strong> {selectedEmployee.salaryType || 'N/A'}</p>
                                    <p><strong>Note:</strong> {selectedEmployee.note || 'N/A'}</p>
                                </Col>
                                <Col md={6}>
                                    {!editMode ? (
                                        <>
                                            <h6>Work Days & Leave Info</h6>
                                            <p><strong>Actual Working Days:</strong> {selectedEmployee.actualWorkingDays || selectedEmployee.totalWorkDays || 0}</p>
                                            <p><strong>Paid Leave Days:</strong> {selectedEmployee.paidLeaveDays || 0}</p>
                                            <p><strong>Unpaid Leave Days:</strong> {selectedEmployee.unpaidLeaveDays || 0}</p>
                                        </>
                                    ) : (
                                        <>
                                            <h6>Work Days & Leave Info (Edit)</h6>
                                            <div className="mb-2">
                                                <label className="form-label"><strong>Actual Working Days:</strong></label>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    value={formData.actualWorkingDays}
                                                    onChange={e => setFormData({ ...formData, actualWorkingDays: parseFloat(e.target.value) || 0 })}
                                                    step="0.5"
                                                />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label"><strong>Paid Leave Days:</strong></label>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    value={formData.paidLeaveDays}
                                                    onChange={e => setFormData({ ...formData, paidLeaveDays: parseFloat(e.target.value) || 0 })}
                                                    step="0.5"
                                                />
                                            </div>
                                            <div className="mb-2">
                                                <label className="form-label"><strong>Unpaid Leave Days:</strong></label>
                                                <input 
                                                    type="number" 
                                                    className="form-control" 
                                                    value={formData.unpaidLeaveDays}
                                                    onChange={e => setFormData({ ...formData, unpaidLeaveDays: parseFloat(e.target.value) || 0 })}
                                                    step="0.5"
                                                />
                                            </div>
                                        </>
                                    )}
                                </Col>
                            </Row>

                            <Row className="mb-3">
                                <Col md={12}>
                                    {!editMode ? (
                                        <>
                                            <h6>Overtime Information</h6>
                                            <Row>
                                                <Col md={6}>
                                                    <p><strong>OT1 - Weekday (x1.5):</strong> {selectedEmployee.otWeekdayHours || 0} h</p>
                                                </Col>
                                                <Col md={6}>
                                                    <p><strong>OT2 - Holiday/Sunday (x2.0):</strong> {selectedEmployee.otHolidayHours || 0} h</p>
                                                </Col>
                                            </Row>
                                        </>
                                    ) : (
                                        <>
                                            <h6>Overtime Information (Edit)</h6>
                                            <Row>
                                                <Col md={6}>
                                                    <div className="mb-2">
                                                        <label className="form-label"><strong>OT1 - Weekday (x1.5):</strong></label>
                                                        <div className="input-group">
                                                            <input 
                                                                type="number" 
                                                                className="form-control" 
                                                                value={formData.otWeekdayHours}
                                                                onChange={e => setFormData({ ...formData, otWeekdayHours: parseFloat(e.target.value) || 0 })}
                                                                step="0.5"
                                                            />
                                                            <span className="input-group-text">h</span>
                                                        </div>
                                                    </div>
                                                </Col>
                                                <Col md={6}>
                                                    <div className="mb-2">
                                                        <label className="form-label"><strong>OT2 - Holiday/Sunday (x2.0):</strong></label>
                                                        <div className="input-group">
                                                            <input 
                                                                type="number" 
                                                                className="form-control" 
                                                                value={formData.otHolidayHours}
                                                                onChange={e => setFormData({ ...formData, otHolidayHours: parseFloat(e.target.value) || 0 })}
                                                                step="0.5"
                                                            />
                                                            <span className="input-group-text">h</span>
                                                        </div>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </>
                                    )}
                                </Col>
                            </Row>

                            <hr />

                            <Row>
                                <Col md={6}>
                                    <h6>Income</h6>
                                    <Table size="sm" borderless>
                                        <tbody>
                                        <tr>
                                            <td>Base Salary</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.baseSalary)}</td>
                                        </tr>
                                        <tr>
                                            <td>Allowance</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.allowance)}</td>
                                        </tr>
                                        <tr>
                                            <td>Product Bonus</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.productBonus)}</td>
                                        </tr>
                                        <tr>
                                            <td>Overtime Pay</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.overtimePay)}</td>
                                        </tr>
                                        </tbody>
                                    </Table>
                                </Col>
                                <Col md={6}>
                                    <h6>Deductions & Tax</h6>
                                    <Table size="sm" borderless>
                                        <tbody>
                                        <tr>
                                            <td>Other Deductions</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.deduction)}</td>
                                        </tr>
                                        <tr>
                                            <td>Family Deduction</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.taxDeductionTotal)}</td>
                                        </tr>
                                        <tr>
                                            <td>Personal Income Tax</td>
                                            <td className="text-end">{formatCurrency(selectedEmployee.personalIncomeTax)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Net Pay</strong></td>
                                            <td className="text-end">
                                                <strong>{formatCurrency(selectedEmployee.totalPay)}</strong>
                                            </td>
                                        </tr>
                                        </tbody>
                                    </Table>
                                </Col>
                            </Row>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {!editMode ? (
                        <>
                            <Button variant="secondary" onClick={handleCloseModal}>
                                Close
                            </Button>
                            <Button variant="primary" onClick={handleEdit}>
                                Edit
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="secondary" onClick={handleCancel}>
                                Cancel
                            </Button>
                            <Button variant="success" onClick={handleSave}>
                                Save Changes
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PayrollDetail;