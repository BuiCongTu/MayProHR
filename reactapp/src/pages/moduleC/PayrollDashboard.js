import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Col, Container, Row, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../../services/api';
import { getCurrentUser } from '../../services/authService';
import { hasAnalysisPermission } from '../../services/moduleC/payrollAnalysisService';
import '../../styles/payroll.css';

const PayrollDashboard = () =>
{
    const currentUser = getCurrentUser();
    const canViewAnalysis = hasAnalysisPermission(currentUser);

    const [stats, setStats] = useState({
        totalPayroll: 0,
        approvedPayroll: 0,
        pendingPayroll: 0,
        totalSalaryExpense: 0
    });
    const [recentPayrolls, setRecentPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() =>
    {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () =>
    {
        try
        {
            setLoading(true);
            setError('');

            const currentYear = new Date().getFullYear();
            const reportResponse = await axiosInstance.get('/payroll/report', {
                params: { year: currentYear }
            });

            let reportData = [];
            if (reportResponse.data.success === false)
            {
                setError(reportResponse.data.message || 'Failed to load statistics');
            } else if (reportResponse.data.data)
            {
                reportData = reportResponse.data.data || [];
            } else if (Array.isArray(reportResponse.data))
            {
                reportData = reportResponse.data;
            }

            // Tính lại các thống kê từ reportData
            const totalPayroll = reportData.length;
            const approvedPayroll = reportData.filter(r => r.status === 'approved').length;
            const pendingPayroll = reportData.filter(r => r.status === 'pending').length;
            const totalSalaryExpense = reportData.reduce((sum, r) => sum + (r.totalSalary || 0), 0);

            setStats(prev => ({
                ...prev,
                totalPayroll,
                approvedPayroll,
                pendingPayroll,
                totalSalaryExpense
            }));

            // Fetch recent payrolls (giữ nguyên như cũ)
            const recentResponse = await axiosInstance.get('/payroll/recent?limit=5');
            let recentData = [];
            if (recentResponse.data.success !== false)
            {
                if (recentResponse.data.data)
                {
                    recentData = recentResponse.data.data || [];
                } else if (Array.isArray(recentResponse.data))
                {
                    recentData = recentResponse.data;
                }
            }
            setRecentPayrolls(recentData);
        } catch (err)
        {
            console.error('Failed to load dashboard:', err);
            setError(err.response?.data?.message || 'Unable to load dashboard data');
        } finally
        {
            setLoading(false);
        }
    };

    const formatCurrency = (value) =>
    {
        if (!value) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    if (loading)
    {
        return (
            <div className="text-center p-5">
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </Spinner>
            </div>);
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
                                <Link to="/payroll/list" className="btn btn-primary">Payroll List</Link>
                                {canViewAnalysis && (
                                    <Link to="/payroll/analysis" className="btn btn-dark">
                                        🤖 AI Analysis
                                    </Link>
                                )}
                                <Link to="/payroll/list" className="btn btn-success">Calculate Payroll</Link>
                                <Link to="/payroll/report" className="btn btn-info">Report</Link>
                                <Link to="/payroll/tax-calculator" className="btn btn-warning">Tax Calculator</Link>
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
                                                    {new Date(payroll.month).toLocaleDateString('en-EN', {
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </strong>
                                            </td>
                                            <td>{payroll.department?.name || 'N/A'}</td>
                                            <td className="text-end">{formatCurrency(payroll.totalSalary)}</td>
                                            <td>
                                                <Badge
                                                    bg={payroll.status === 'approved' ? 'success' : 'warning'}
                                                >
                                                    {payroll.status}
                                                </Badge>
                                            </td>
                                            <td className="d-flex gap-2">
                                                <Link
                                                    to={`/payroll/${payroll.id}`}
                                                    className="btn btn-sm btn-info"
                                                >
                                                    View
                                                </Link>
                                                <Link
                                                    to={`/payroll/${payroll.id}/calculate`}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Calculate
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