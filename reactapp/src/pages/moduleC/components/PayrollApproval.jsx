// factory directory duyet
import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Table, Alert, Modal, Spinner, Badge, Row, Col } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../../styles/payroll.css';

const BASE_API = 'http://localhost:9999/api';

const PayrollApproval = () => {
    const { payrollId } = useParams();
    const navigate = useNavigate();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [approveNote, setApproveNote] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

    useEffect(() => {
        if (payrollId) {
            fetchPayrollDetails();
        }
    }, [payrollId]);

    const fetchPayrollDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_API}/payroll/${payrollId}`);

            if (response.data.success) {
                setPayroll(response.data.data);
            } else {
                setError(response.data.message || 'Not Loadding Payroll Details. Please try again later.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error loading payroll details: '
                + err.message || 'Unknown error. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        try {
            setLoading(true);
            const response = await axios.post(
                `${BASE_API}/payroll/${payrollId}/approve`,
                {
                    approverNote: approveNote
                }
            );

            if (response.data.success) {
                setShowModal(false);
                navigate('/payroll', {
                    state: { message: 'Approve payroll successfully.' }
                });
            } else {
                setError(response.data.message || 'Approve failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error during approval');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        try {
            setLoading(true);
            // Assuming there's a reject endpoint
            const response = await axios.post(
                `${BASE_API}/payroll/${payrollId}/reject`,
                {
                    rejectReason: approveNote
                }
            );

            if (response.data.success) {
                setShowModal(false);
                navigate('/payroll', {
                    state: { message: 'Payroll rejected successfully!' }
                });
            } else {
                setError(response.data.message || 'Reject failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error while rejecting');
        } finally {
            setLoading(false);
        }
    };

    const openApprovalModal = (type) => {
        setActionType(type);
        setApproveNote('');
        setShowModal(true);
    };

    const formatCurrency = (value) => {
        if (!value) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const calculateTotalDeductions = () => {
        if (!payroll?.employees) return 0;
        return payroll.employees.reduce((sum, emp) => sum + (emp.deduction || 0), 0);
    };

    const calculateTotalIncome = () => {
        if (!payroll?.employees) return 0;
        return payroll.employees.reduce((sum, emp) => sum + (emp.totalPay || 0), 0);
    };

    if (loading && !payroll) {
        return (
            <div className="text-center p-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Lodding...</span>
                </Spinner>
            </div>
        );
    }

    if (!payroll) {
        return <Alert variant="danger">No payroll found</Alert>;
    }

    return (
        <div className="payroll-approval-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2> Payroll Approval</h2>
                <Button
                    variant="outline-secondary"
                    onClick={() => navigate('/payroll')}
                >
                    ← Back to Payroll List
                </Button>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="mb-4">
                <Col lg={8}>
                    <Card className="shadow-sm mb-3">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0"> Payroll Information</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <p>
                                        <strong>Tháng:</strong>{' '}
                                        {new Date(payroll.month).toLocaleDateString('vi-VN', {
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </p>
                                    <p>
                                        <strong>Phòng Ban:</strong> {payroll.departmentName}
                                    </p>
                                </Col>
                                <Col md={6}>
                                    <p>
                                        <strong>Trạng Thái:</strong>{' '}
                                        <Badge bg={payroll.status === 'approved' ? 'success' : 'warning'}>
                                            {payroll.status}
                                        </Badge>
                                    </p>
                                    <p>
                                        <strong>Tổng Lương:</strong>{' '}
                                        <strong className="text-primary">
                                            {formatCurrency(payroll.totalSalary)}
                                        </strong>
                                    </p>
                                </Col>
                            </Row>

                            <hr />

                            <h6 className="mb-3"> Employee List ({payroll.employees?.length})</h6>

                            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <Table striped hover size="sm">
                                    <thead className="bg-light">
                                    <tr>
                                        <th>Full Name</th>
                                        <th>Base Salary</th>
                                        <th>Bonus</th>
                                        <th>Overtime</th>
                                        <th>Allowance</th>
                                        <th>Deductions</th>
                                        <th>Total</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {payroll.employees?.map((emp, idx) => (
                                        <tr key={idx}>
                                            <td>{emp.employeeName}</td>
                                            <td className="text-end">{formatCurrency(emp.baseSalary)}</td>
                                            <td className="text-end">{formatCurrency(emp.productBonus)}</td>
                                            <td className="text-end">{formatCurrency(emp.overtimePay)}</td>
                                            <td className="text-end">{formatCurrency(emp.allowance)}</td>
                                            <td className="text-end text-danger">{formatCurrency(emp.deduction)}</td>
                                            <td className="text-end">
                                                <strong>{formatCurrency(emp.totalPay)}</strong>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                    <tfoot>
                                    <tr className="bg-light">
                                        <th colSpan="5" className="text-end">Total:</th>
                                        <th className="text-end">
                                            {formatCurrency(calculateTotalDeductions())}
                                        </th>
                                        <th className="text-end">
                                            <strong>{formatCurrency(calculateTotalIncome())}</strong>
                                        </th>
                                    </tr>
                                    </tfoot>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">Approved</h5>
                        </Card.Header>
                        <Card.Body>
                            <Form.Group className="mb-3">
                                <Form.Label>
                                    <strong>Review Notes</strong>
                                </Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={4}
                                    placeholder="Enter notes here..."
                                    value={approveNote}
                                    onChange={(e) => setApproveNote(e.target.value)}
                                />
                                <Form.Text className="text-muted">
                                    The notes will be saved.
                                </Form.Text>
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button
                                    variant="success"
                                    size="lg"
                                    onClick={() => openApprovalModal('approve')}
                                    disabled={payroll.status === 'approved'}
                                >
                                    Approved
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={() => openApprovalModal('reject')}
                                    disabled={payroll.status === 'approved'}
                                >
                                    Rejected
                                </Button>
                            </div>

                            {payroll.status === 'approved' && (
                                <Alert variant="success" className="mt-3 mb-0">
                                    Approved payroll
                                </Alert>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Approval Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {actionType === 'approve' ? 'Confirm Approval' : 'Rejection Confirmation'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        {actionType === 'approve'
                            ? 'Are you sure you want to approve this payroll?'
                            : 'Are you sure you want to reject this payroll?'}
                    </p>
                    {approveNote && (
                        <div className="alert alert-info">
                            <strong>Note:</strong> {approveNote}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button
                        variant="outline-secondary"
                        onClick={() => setShowModal(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant={actionType === 'approve' ? 'success' : 'danger'}
                        onClick={actionType === 'approve' ? handleApprove : handleReject}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Spinner
                                    as="span"
                                    animation="border"
                                    size="sm"
                                    role="status"
                                    aria-hidden="true"
                                    className="me-2"
                                />
                                Processing approval...
                            </>
                        ) : (
                            (actionType === 'approve' ? 'Approved' : 'Rejected')
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PayrollApproval;