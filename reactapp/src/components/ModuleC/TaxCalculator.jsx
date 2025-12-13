import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import '../../styles/payroll.css';

const BASE_API = 'http://localhost:9999/api';

export default function TaxCalculator({userId = null}) {
    const [formData, setFormData] = useState({
        userId: userId || '',
        grossIncome: '',
        month: new Date().toISOString().split('T')[0]
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [employees, setEmployees] = useState([]);

    // Lấy danh sách nhân viên
    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            const response = await axios.get(`${BASE_API}/users`);
            setEmployees(response.data || []);
        } catch (err) {
            console.error('Error loading:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCalculate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await axios.get(`${BASE_API}/payroll/calculate-tax`, {
                params: {
                    userId: parseInt(formData.userId),
                    grossIncome: parseFloat(formData.grossIncome),
                    month: formData.month
                }
            });

            
            let result = null;
            if (response.data.success === false) {
                setError(response.data.message || 'Calculator failed. Please try again.');
            } else if (response.data.data) {
                result = response.data.data;
            } else if (response.data.taxTaxable || response.data.personalIncomeTax) {
                
                result = response.data;
            }

            if (result) {
                setResult(result);
                setError('');
            } else if (response.data.success !== false) {
                setError('Failed to calculate tax');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error calculating tax: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    return (
        <div className="tax-calculator-container p-4">
            <h2 className="mb-4"> Personal Income Tax Calculator</h2>

            <Row>
                <Col lg={5}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0"> Data Entry</h5>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleCalculate}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Employee <span className="text-danger">*</span></Form.Label>
                                    <Form.Select
                                        name="userId"
                                        value={formData.userId}
                                        onChange={handleInputChange}
                                        required
                                    >
                                        <option value="">-- Select employee --</option>
                                        {employees.map(emp => (
                                            <option key={emp.userId} value={emp.userId}>
                                                {emp.fullName} (ID: {emp.userId})
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Income From Salary (VND) <span className="text-danger">*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="grossIncome"
                                        value={formData.grossIncome}
                                        onChange={handleInputChange}
                                        placeholder="please input income from salary"
                                        step="1000"
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        Gross salary before tax
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Tax Month</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="month"
                                        value={formData.month}
                                        onChange={handleInputChange}
                                    />
                                </Form.Group>

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100"
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
                                            Calculating...
                                        </>
                                    ) : (
                                        ' Calculate Tax'
                                    )}
                                </Button>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={7}>
                    {error && (
                        <Alert variant="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}

                    {result && (
                        <Card className="shadow-sm">
                            <Card.Header className="bg-success text-white">
                                <h5 className="mb-0"> Tax Calculation Results</h5>
                            </Card.Header>
                            <Card.Body>
                                <Row className="mb-3">
                                    <Col md={6}>
                                        <p><strong> Full name:</strong> {result.userName}</p>
                                        <p><strong> Date of receipt:</strong> {result.hireDate}</p>
                                    </Col>
                                    <Col md={6}>
                                        <p><strong> Income From Salary:</strong></p>
                                        <h6 className="text-primary">{formatCurrency(result.grossIncome)}</h6>
                                    </Col>
                                </Row>

                                <hr />

                                <h6 className="mb-3"> <strong>Deductions:</strong></h6>
                                <div className="deduction-list">
                                    <Row className="mb-2">
                                        <Col xs={8}>Self-reduction</Col>
                                        <Col xs={4} className="text-end">{formatCurrency(result.personalDeductionAmount)}</Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col xs={8}>Dependent deduction ({result.numberOfDependents} người)</Col>
                                        <Col xs={4} className="text-end">{formatCurrency(result.dependentDeductionAmount)}</Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col xs={8}>Insurance deduction ({result.insuranceRate}%)</Col>
                                        <Col xs={4} className="text-end">{formatCurrency(result.insuranceDeductionAmount)}</Col>
                                    </Row>
                                </div>

                                <hr />

                                <Row className="mb-2">
                                    <Col xs={8}>
                                        <strong>Total Deduction:</strong>
                                    </Col>
                                    <Col xs={4} className="text-end">
                                        <strong>{formatCurrency(result.totalDeductionAmount)}</strong>
                                    </Col>
                                </Row>

                                <Row className="mb-3 p-2 bg-light rounded">
                                    <Col xs={8}>
                                        <strong>Taxable Income:</strong>
                                    </Col>
                                    <Col xs={4} className="text-end">
                                        <strong className="text-info">{formatCurrency(result.taxableIncome)}</strong>
                                    </Col>
                                </Row>

                                <h6 className="mb-3"> <strong>Tax by Tier:</strong></h6>
                                {result.bracket1 && result.bracket1.incomeInBracket > 0 && (
                                    <Row className="mb-2 tax-bracket">
                                        <Col xs={6}>Bracket 1 (0-10M): {formatCurrency(result.bracket1.incomeInBracket)} @ 5%</Col>
                                        <Col xs={6} className="text-end">{formatCurrency(result.bracket1.taxAmount)}</Col>
                                    </Row>
                                )}
                                {result.bracket2 && result.bracket2.incomeInBracket > 0 && (
                                    <Row className="mb-2 tax-bracket">
                                        <Col xs={6}>Bracket 2 (10-30M): {formatCurrency(result.bracket2.incomeInBracket)} @ 10%</Col>
                                        <Col xs={6} className="text-end">{formatCurrency(result.bracket2.taxAmount)}</Col>
                                    </Row>
                                )}
                                {result.bracket3 && result.bracket3.incomeInBracket > 0 && (
                                    <Row className="mb-2 tax-bracket">
                                        <Col xs={6}>Bracket 3 (30-60M): {formatCurrency(result.bracket3.incomeInBracket)} @ 20%</Col>
                                        <Col xs={6} className="text-end">{formatCurrency(result.bracket3.taxAmount)}</Col>
                                    </Row>
                                )}
                                {result.bracket4 && result.bracket4.incomeInBracket > 0 && (
                                    <Row className="mb-2 tax-bracket">
                                        <Col xs={6}>Bracket 4 (60-100M): {formatCurrency(result.bracket4.incomeInBracket)} @ 30%</Col>
                                        <Col xs={6} className="text-end">{formatCurrency(result.bracket4.taxAmount)}</Col>
                                    </Row>
                                )}
                                {result.bracket5 && result.bracket5.incomeInBracket > 0 && (
                                    <Row className="mb-3 tax-bracket">
                                        <Col xs={6}>Bracket 5 (>100M): {formatCurrency(result.bracket5.incomeInBracket)} @ 35%</Col>
                                        <Col xs={6} className="text-end">{formatCurrency(result.bracket5.taxAmount)}</Col>
                                    </Row>
                                )}

                                <hr />

                                <Row className="p-2 bg-danger bg-opacity-10 rounded">
                                    <Col xs={8}>
                                        <h5> Total Personal Income Tax:</h5>
                                    </Col>
                                    <Col xs={4} className="text-end">
                                        <h5 className="text-danger">{formatCurrency(result.totalTax)}</h5>
                                    </Col>
                                </Row>

                                {result.calculationNote && (
                                    <Alert variant="info" className="mt-3 mb-0">
                                        {result.calculationNote}
                                    </Alert>
                                )}
                            </Card.Body>
                        </Card>
                    )}
                </Col>
            </Row>
        </div>
    );
}