import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../../styles/payroll.css';

const BASE_API = 'http://localhost:9999/api';

const PayrollDashboard = () => {
    const [stats, setStats] = useState({
        totalPayroll: 0,
        approvedPayroll: 0,
        pendingPayroll: 0,
        totalSalaryExpense: 0,
        monthlyTrend: []
    });
    const [recentPayrolls, setRecentPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch statistics
            const statsResponse = await axios.get(`${BASE_API}/payroll/statistics`);
            if (statsResponse.data.success) {
                setStats(statsResponse.data.data);
            }

            // Fetch recent payrolls
            const recentResponse = await axios.get(`${BASE_API}/payroll/recent?limit=5`);
            if (recentResponse.data.success) {
                setRecentPayrolls(recentResponse.data.data || []);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
            setError(err.response?.data?.message || 'Unable to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

    const statusData = [
        { name: 'Approved', value: stats.approvedPayroll, color: '#28a745' },
        { name: 'Pending', value: stats.pendingPayroll, color: '#ffc107' }
    ];

    if (loading) {
        return (
            <div className="text-center p-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>
        );
    }

    return (
        <Container fluid className="payroll-dashboard p-4">
            <h1 className="mb-4"> Payroll Dashboard</h1>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Stats Cards */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm stat-card">
                        <Card.Body className="text-center">
                            <h6 className="text-muted">Total Payrolls</h6>
                            <h3 className="text-primary">{stats.totalPayroll}</h3>
                            <small>across all months</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm stat-card">
                        <Card.Body className="text-center">
                            <h6 className="text-muted">Approved</h6>
                            <h3 className="text-success">{stats.approvedPayroll}</h3>
                            <small>payrolls</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm stat-card">
                        <Card.Body className="text-center">
                            <h6 className="text-muted">Pending</h6>
                            <h3 className="text-warning">{stats.pendingPayroll}</h3>
                            <small>payrolls</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm stat-card">
                        <Card.Body className="text-center">
                            <h6 className="text-muted">Total Salary Expense</h6>
                            <h5 className="text-danger">{formatCurrency(stats.totalSalaryExpense)}</h5>
                            <small>this year</small>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="shadow-sm stat-card">
                        <Card.Body className="text-center">
                            <h6 className="text-muted">Total Salary Expense</h6>
                            <h5 className="text-danger">{formatCurrency(stats.totalSalaryExpense)}</h5>
                            <small>this Month</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts */}
            <Row className="mb-4">
                <Col lg={8}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h6 className="mb-0"> Monthly Salary Expense Trend</h6>
                        </Card.Header>
                        <Card.Body>
                            {stats.monthlyTrend && stats.monthlyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={stats.monthlyTrend}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="totalSalary"
                                            stroke="#0088FE"
                                            name="Salary Expense"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted">No data available</div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h6 className="mb-0"> Payroll Status</h6>
                        </Card.Header>
                        <Card.Body>
                            {statusData.some(s => s.value > 0) ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value}`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted">No data available</div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions */}
            <Row className="mb-4">
                <Col lg={12}>
                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h6 className="mb-0">Quick Actions</h6>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2 d-md-flex">
                                <Link to="/payroll/list" className="btn btn-primary">
                                    Payroll List
                                </Link>
                                <Link to="/payroll/create" className="btn btn-success">
                                    ➕ Create New
                                </Link>
                                <Link to="/payroll/report" className="btn btn-info">
                                    Report
                                </Link>
                                <Link to="/payroll/tax-calculator" className="btn btn-warning">
                                    Tax Calculator
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Recent Payrolls */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0"> Recent Payrolls</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {recentPayrolls.length === 0 ? (
                        <div className="alert alert-info m-3 mb-0">
                            No recent payrolls
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table table-hover mb-0">
                                <thead className="bg-light">
                                <tr>
                                    <th>Month</th>
                                    <th>Department</th>
                                    <th className="text-end">Total Salary</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                                </thead>
                                <tbody>
                                {recentPayrolls.map(payroll => (
                                    <tr key={payroll.payrollId}>
                                        <td>
                                            <strong>
                                                {new Date(payroll.month).toLocaleDateString('vi-VN', {
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </strong>
                                        </td>
                                        <td>{payroll.departmentName}</td>
                                        <td className="text-end">{formatCurrency(payroll.totalSalary)}</td>
                                        <td>
                                            <Badge
                                                bg={payroll.status === 'approved' ? 'success' : 'warning'}
                                            >
                                                {payroll.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            <Link
                                                to={`/payroll/${payroll.payrollId}`}
                                                className="btn btn-sm btn-info"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
};

export default PayrollDashboard;