import React, { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Table, Spinner } from 'react-bootstrap';
import payrollService from '../../services/moduleC/payrollService';
import '../../styles/payroll.css';

const TimeBasedPayrollBreakdown = ({ employeePayrollId, payrollMonth }) => {
    const [breakdown, setBreakdown] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadBreakdown = async () => {
            try {
                setLoading(true);
                setError('');

                // payrollService.getPayrollBreakdown đã extractData => trả về data trực tiếp
                const data = await payrollService.getPayrollBreakdown(employeePayrollId);
                if (data) {
                    setBreakdown(data);
                } else {
                    setError('Failed to load payroll breakdown');
                }
            } catch (err) {
                console.error('Error loading breakdown:', err);
                setError(err?.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        if (employeePayrollId) {
            loadBreakdown();
        }
    }, [employeePayrollId]);

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatPercentFromFraction = (fraction) => {
        const f = Number(fraction ?? 0);
        return (f * 100).toFixed(2);
    };

    if (loading) {
        return (
            <div className="text-center p-4">
                <Spinner animation="border" />
            </div>
        );
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    if (!breakdown || breakdown.salaryType !== 'TimeBased') {
        return <Alert variant="warning">No TimeBased payroll data available</Alert>;
    }

    return (
        <div className="payroll-breakdown-container">
            {/* === HEADER === */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-primary text-white">
                    <h5 className="mb-0">📊 Chi tiết lương (Theo Thời Gian)</h5>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={4}>
                            <p><strong>Nhân viên:</strong> {breakdown.fullName}</p>
                            <p><strong>Ngày vào công ty:</strong> {breakdown.hireDate}</p>
                        </Col>
                        <Col md={4}>
                            <p><strong>Bộ phận:</strong> {breakdown.departmentName}</p>
                            <p><strong>Tháng/Năm:</strong> {payrollMonth}</p>
                        </Col>
                        <Col md={4}>
                            <p><strong>Loại lương:</strong> <span className="badge bg-info">TimeBased</span></p>
                            <p><strong>Lương ròng:</strong> <strong className="text-success">{formatCurrency(breakdown.totalPay)}</strong></p>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* === LƯƠNG THỜI GIAN === */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">💰 Lương Thời Gian</h6>
                </Card.Header>
                <Card.Body>
                    <Table size="sm" bordered>
                        <tbody>
                        <tr>
                            <td><strong>Lương cơ bản</strong></td>
                            <td className="text-right">{formatCurrency(breakdown.baseSalary)}</td>
                        </tr>
                        <tr>
                            <td><strong>Ngày công chuẩn</strong></td>
                            <td className="text-right">{breakdown.standardWorkingDays} ngày</td>
                        </tr>
                        <tr>
                            <td><strong>Ngày công thực tế</strong></td>
                            <td className="text-right">{breakdown.actualWorkingDays} ngày</td>
                        </tr>
                        <tr className="table-success">
                            <td><strong>Lương thời gian</strong> (cơ bản / 26 × ngày công)</td>
                            <td className="text-right"><strong>{formatCurrency(breakdown.timeSalary)}</strong></td>
                        </tr>
                        </tbody>
                    </Table>

                    {/* === CHI TIẾT NGÀY CÔNG === */}
                    <div className="mt-3 p-3 bg-light rounded">
                        <h6>Chi tiết ngày công:</h6>
                        <Row className="text-center">
                            <Col md={3}>
                                <p>Ngày phép được duyệt</p>
                                <h5 className="text-info">{breakdown.paidLeaveDays} ngày</h5>
                            </Col>
                            <Col md={3}>
                                <p>Ngày phép không lương</p>
                                <h5 className="text-warning">{breakdown.unpaidLeaveDays} ngày</h5>
                            </Col>
                            <Col md={3}>
                                <p>Số lần đi trễ</p>
                                <h5 className="text-danger">{breakdown.lateCount} lần</h5>
                            </Col>
                            <Col md={3}>
                                <p>Phạt đi trễ</p>
                                <h5 className="text-danger">{formatCurrency(breakdown.latePenalty)}</h5>
                            </Col>
                        </Row>
                    </div>
                </Card.Body>
            </Card>

            {/* === KHOẢN KHẤU TRỪ === */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">📉 Khoản Khấu Trừ</h6>
                </Card.Header>
                <Card.Body>
                    <Table size="sm" bordered>
                        <tbody>
                        <tr>
                            <td>Bảo hiểm</td>
                            <td className="text-right text-danger">-{formatCurrency(breakdown.insurance)}</td>
                        </tr>
                        <tr>
                            <td>Phạt khác</td>
                            <td className="text-right text-danger">-{formatCurrency(breakdown.latePenalty)}</td>
                        </tr>
                        <tr className="table-danger">
                            <td><strong>Tổng khấu trừ</strong></td>
                            <td className="text-right"><strong>-{formatCurrency(breakdown.totalDeduction)}</strong></td>
                        </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* === THUẾ & PHỤ CẤP === */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">💳 Thuế & Phụ Cấp</h6>
                </Card.Header>
                <Card.Body>
                    <Table size="sm" bordered>
                        <tbody>
                        <tr>
                            <td><strong>Tổng thu nhập tính thuế</strong></td>
                            <td className="text-right">{formatCurrency(breakdown.grossIncomeForTax)}</td>
                        </tr>
                        <tr>
                            <td>Thuế TNCN</td>
                            <td className="text-right text-danger">-{formatCurrency(breakdown.personalIncomeTax)}</td>
                        </tr>
                        <tr>
                            <td>Phụ cấp thường xuyên</td>
                            <td className="text-right text-success">+{formatCurrency(breakdown.allowance)}</td>
                        </tr>
                        </tbody>
                    </Table>

                    {/* Hiển thị giải thích chi tiết từ PersonalIncomeTaxCalService nếu backend có trả */}
                    {breakdown.taxCalculation?.note ? (
                        <Alert variant="secondary" className="mt-3 mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                            <strong>Chi tiết tính thuế (BE):</strong>
                            {'\n\n'}
                            {breakdown.taxCalculation.note}
                        </Alert>
                    ) : null}

                    {/* nếu backend có trả insuranceRate dạng fraction */}
                    {breakdown.taxCalculation?.insuranceRate !== undefined ? (
                        <div className="text-muted mt-2">
                            Insurance rate: {formatPercentFromFraction(breakdown.taxCalculation.insuranceRate)}%
                        </div>
                    ) : null}
                </Card.Body>
            </Card>

            {/* === TỔNG LƯƠNG === */}
            <Card className="mb-4 shadow-sm border-success">
                <Card.Header className="bg-success text-white">
                    <h5 className="mb-0">✅ LƯƠNG RÒNG (NET)</h5>
                </Card.Header>
                <Card.Body className="text-center">
                    <h2 className="text-success">{formatCurrency(breakdown.totalPay)}</h2>
                    <p className="text-muted mt-2">{breakdown.note}</p>
                </Card.Body>
            </Card>
        </div>
    );
};

export default TimeBasedPayrollBreakdown;