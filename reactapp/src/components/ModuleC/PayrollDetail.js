// view payroll details
            import React, { useEffect, useState } from 'react';
            import { useParams, useNavigate } from 'react-router-dom';
            import { Button, Card, Col, Modal, Row, Spinner, Table, Badge } from 'react-bootstrap';
            import payrollService from '../../services/moduleC/payrollService';

            const PayrollDetail = () =>
            {
                const { payrollId } = useParams();
                const navigate = useNavigate();

                const [payroll, setPayroll] = useState(null);
                const [loading, setLoading] = useState(false);
                const [error, setError] = useState('');

                const [selectedEmployee, setSelectedEmployee] = useState(null);
                const [showModal, setShowModal] = useState(false);

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
                    setShowModal(true);
                };

                const handleCloseModal = () =>
                {
                    setShowModal(false);
                    setSelectedEmployee(null);
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
                                                <p><strong>Note:</strong> {selectedEmployee.note || 'N/A'}</p>
                                            </Col>
                                            <Col md={6}>
                                                <h6>Work / Production Info</h6>
                                                <p><strong>Work Days:</strong> {selectedEmployee.totalWorkDays || 0}</p>
                                                <p><strong>Overtime Hours:</strong> {selectedEmployee.totalOvertimeHours || 0}</p>
                                                <p><strong>Production Quantity:</strong> {selectedEmployee.totalProductionQuantity || 0}</p>
                                            </Col>
                                        </Row>

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
                                <Button variant="secondary" onClick={handleCloseModal}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    </div>
                );
            };

            export default PayrollDetail;