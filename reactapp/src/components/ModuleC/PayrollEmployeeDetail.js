
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Spinner, Alert, Row, Col, Button } from 'react-bootstrap';
import PayrollBreakdownSelector from './PayrollBreakdownSelector';
import payrollService from '../../services/moduleC/payrollService';

const PayrollEmployeeDetail = () => {
    const { payrollId, employeePayrollId } = useParams();
    const navigate = useNavigate();
    const [payrollData, setPayrollData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [payrollMonth, setPayrollMonth] = useState(null);

    useEffect(() => {
        const loadPayrollDetail = async () => {
            try {
                setLoading(true);
                setError('');

                console.log('[PayrollEmployeeDetail] Loading for:', {
                    payrollId,
                    employeePayrollId
                });

                // Lấy dữ liệu chi tiết lương
                const response = await payrollService.getPayrollBreakdown(employeePayrollId);

                console.log('[PayrollEmployeeDetail] Response:', response);

                if (response?.success && response?.data) {
                    const data = response.data;
                    setPayrollData(data);

                    // Format payrollMonth để hiển thị
                    if (data.payrollMonth) {
                        const date = new Date(data.payrollMonth);
                        const formattedMonth = date.toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: 'numeric'
                        });
                        setPayrollMonth(formattedMonth);
                    }
                } else if (response?.data) {
                    const data = response.data;
                    setPayrollData(data);
                    if (data.payrollMonth) {
                        const date = new Date(data.payrollMonth);
                        const formattedMonth = date.toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: 'numeric'
                        });
                        setPayrollMonth(formattedMonth);
                    }
                } else {
                    const errorMsg = response?.message || 'Failed to load payroll detail';
                    console.error('[PayrollEmployeeDetail] Error response:', errorMsg);
                    setError(errorMsg);
                }
            } catch (err) {
                console.error('[PayrollEmployeeDetail] Exception:', err);
                setError(err?.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (employeePayrollId) {
            loadPayrollDetail();
        } else {
            console.warn('[PayrollEmployeeDetail] employeePayrollId is null or undefined');
            setError('Invalid employee payroll ID');
            setLoading(false);
        }
    }, [employeePayrollId]);

    const handleRecalculate = async () => {
        try {
            setLoading(true);
            await payrollService.recalculatePayroll(employeePayrollId);
            // Reload dữ liệu
            window.location.reload();
        } catch (err) {
            setError('Failed to recalculate payroll');
            console.error('Recalculate error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !payrollData) {
        return (
            <Container className="mt-5">
                <div className="text-center">
                    <Spinner animation="border" />
                </div>
            </Container>
        );
    }

    if (error && !payrollData) {
        return (
            <Container className="mt-5">
                <Alert variant="danger">{error}</Alert>
                <Button
                    onClick={() => navigate(`/payroll/${payrollId}`)}
                    variant="secondary"
                >
                    Quay lại Bảng lương
                </Button>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4 mb-5">
            {error && <Alert variant="warning" dismissible>{error}</Alert>}

            <Row className="mb-4">
                <Col>
                    <h2>Chi tiết Bảng Lương - {payrollData?.fullName}</h2>
                </Col>
                <Col className="text-end">
                    <Button
                        variant="secondary"
                        onClick={() => navigate(`/payroll/${payrollId}`)}
                        className="me-2"
                    >
                        ← Quay lại
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleRecalculate}
                        disabled={loading}
                    >
                        {loading ? 'Đang tính toán...' : 'Tính lại Lương'}
                    </Button>
                </Col>
            </Row>

            {/* Sử dụng PayrollBreakdownSelector */}
            <PayrollBreakdownSelector
                employeePayrollId={employeePayrollId}
                payrollMonth={payrollMonth}
            />
        </Container>
    );
};

export default PayrollEmployeeDetail;