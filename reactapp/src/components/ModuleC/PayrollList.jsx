
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../../services/api';
import '../../styles/payroll.css';
import LineSelector from './LineSelector';

const PayrollList = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [filteredPayrolls, setFilteredPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [filters, setFilters] = useState({
        status: '',
        departmentId: null,
        departmentName: '',
        lineId: null,
        lineName: '',
        yearMonth: ''
    });

    const [departments, setDepartments] = useState([]);
    const [showLineSelector, setShowLineSelector] = useState(false);
    const [selectedDeptForLines, setSelectedDeptForLines] = useState(null);

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (filters.departmentId) {
            fetchPayrolls();
        } else {
            setPayrolls([]);
            setFilteredPayrolls([]);
        }
    }, [filters.departmentId, filters.lineId, currentPage, pageSize]);

    //filters status và yearMonth
    useEffect(() => {
        applyFilters();
    }, [payrolls, filters.status, filters.yearMonth]);

    const fetchDepartments = async () => {
        try {
            setDepartmentsLoading(true);

            const response = await axiosInstance.get('/department');
            let departments = [];

            if (Array.isArray(response.data)) {
                departments = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                departments = response.data.data;
            } else if (response.data?.content && Array.isArray(response.data.content)) {
                departments = response.data.content;
            }

            setDepartments(departments);
        } catch (err) {
            setError('Unable to load departments: ' + (err.response?.data?.message || err.message));
            setDepartments([]);
        } finally {
            setDepartmentsLoading(false);
        }
    };

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            setError('');

            const params = {
                page: currentPage - 1,
                size: pageSize
            };

            if (filters.departmentId) {
                params.departmentId = filters.departmentId;
            }

            if (filters.lineId) {
                params.lineId = filters.lineId;
            }

            const response = await axiosInstance.get('/payroll/list', { params });
            const responseData = response.data;

            let payrollData = [];

            if (responseData?.success === false) {
                setPayrolls([]);
                const errorMsg = responseData.message || 'Failed to load payrolls';
                setError(errorMsg);
            } else if (Array.isArray(responseData)) {
                payrollData = responseData;
                setPayrolls(payrollData);
                setError('');
            } else if (responseData?.data && Array.isArray(responseData.data)) {
                payrollData = responseData.data;
                setPayrolls(payrollData);
                setError('');
            } else {
                setPayrolls([]);
                setError('Unexpected response format from server');
            }
        } catch (err) {
            console.error('Error loading payroll:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status
            });

            let errorMsg = 'Unable to load payroll list';

            if (err.response?.status === 401) {
                errorMsg = 'Unauthorized: Please log in again';
            } else if (err.response?.status === 403) {
                errorMsg = 'Forbidden: You do not have permission to access payrolls';
            } else if (err.response?.status === 400) {
                errorMsg = 'Bad request: ' + (err.response?.data?.message || 'Invalid parameters');
            } else if (err.response?.status === 500) {
                errorMsg = 'Server error: ' + (err.response?.data?.message || 'Please try again later');
            } else if (err.message === 'Network Error') {
                errorMsg = 'Network error: Cannot connect to server';
            }

            setError(errorMsg);
            setPayrolls([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...payrolls];

        // Filter by status
        if (filters.status) {
            filtered = filtered.filter(p => {
                const status = (p.status || '').toLowerCase();
                return status === filters.status.toLowerCase();
            });
        }

        // Filter by year-month
        if (filters.yearMonth) {
            filtered = filtered.filter(p => {
                if (p.month) {
                    const payrollMonth = new Date(p.month).toISOString().substring(0, 7);
                    return payrollMonth === filters.yearMonth;
                }
                return false;
            });
        }

        console.log('After applying filters:', {
            original: payrolls.length,
            filtered: filtered.length,
            filters
        });

        setFilteredPayrolls(filtered);
    };

    const handleStatusFilterChange = (e) => {
        const { value } = e.target;
        setFilters(prev => ({
            ...prev,
            status: value
        }));
        setCurrentPage(1);
    };

    const handleDepartmentChange = (e) => {
        const selectedId = parseInt(e.target.value);
        if (selectedId) {
            const dept = departments.find(d => d.id === selectedId);
            console.log('Selected department:', dept);
            setFilters(prev => ({
                ...prev,
                departmentId: selectedId,
                departmentName: dept?.name || '',
                lineId: null,
                lineName: ''
            }));
            setSelectedDeptForLines(selectedId);
            setShowLineSelector(true);
            setCurrentPage(1);
        } else {
            setFilters(prev => ({
                ...prev,
                departmentId: null,
                departmentName: '',
                lineId: null,
                lineName: ''
            }));
            setShowLineSelector(false);
            setCurrentPage(1);
        }
    };

    const handleLineSelected = (lineNode) => {
        console.log('Selected line:', lineNode);
        setFilters(prev => ({
            ...prev,
            lineId: lineNode.id,
            lineName: lineNode.name
        }));
        setShowLineSelector(false);
        setCurrentPage(1);
    };

    const handleYearMonthChange = (e) => {
        const { value } = e.target;
        setFilters(prev => ({
            ...prev,
            yearMonth: value
        }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            status: '',
            departmentId: null,
            departmentName: '',
            lineId: null,
            lineName: '',
            yearMonth: ''
        });
        setShowLineSelector(false);
        setCurrentPage(1);
    };

    const getStatusBadge = (status) => {
        const statusStr = (status || '').toLowerCase();
        const statusMap = {
            pending: 'warning',
            balanced: 'info',
            approved: 'success',
            rejected: 'danger'
        };
        return statusMap[statusStr] || 'secondary';
    };

    const getStatusLabel = (status) => {
        const statusStr = (status || '').toLowerCase();
        const labels = {
            pending: 'Pending',
            balanced: 'Balance',
            approved: 'Approved',
            rejected: 'Reject'
        };
        return labels[statusStr] || status;
    };

    const formatCurrency = (value) => {
        if (!value || isNaN(value)) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('vi-VN');
        } catch (e) {
            return dateString;
        }
    };

    // Paginate the filtered results
    const paginatedPayrolls = filteredPayrolls.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const filteredTotalPages = Math.ceil(filteredPayrolls.length / pageSize);

    return (
        <div className="payroll-list-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Payroll List</h2>
                <Link to="/payroll/list" className="btn btn-primary">
                    Calculate Payroll
                </Link>

            </div>

            {error && <Alert variant={error.includes('No payrolls') ? 'info' : 'danger'}>{error}</Alert>}

            {/* Filters */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">🔍 Filters</h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Department <span className="text-danger">*</span></Form.Label>
                                {departmentsLoading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <Form.Select
                                        value={filters.departmentId || ''}
                                        onChange={handleDepartmentChange}
                                        disabled={departmentsLoading}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.length > 0 ? (
                                            departments.map(dept => (
                                                <option key={dept.id} value={dept.id}>
                                                    {dept.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option disabled>No departments available</option>
                                        )}
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    value={filters.status}
                                    onChange={handleStatusFilterChange}
                                >
                                    <option value="">All</option>
                                    <option value="pending">Pending</option>
                                    <option value="balanced">Balanced</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Year-Month</Form.Label>
                                <Form.Control
                                    type="month"
                                    value={filters.yearMonth}
                                    onChange={handleYearMonthChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>&nbsp;</Form.Label>
                                <Button
                                    variant="outline-secondary"
                                    className="w-100"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </Button>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Line selector - shows when department is selected */}
                    {showLineSelector && selectedDeptForLines && (
                        <div className="mt-4 border-top pt-4">
                            <LineSelector
                                departmentId={selectedDeptForLines}
                                onLineSelected={handleLineSelected}
                            />
                        </div>
                    )}

                    {/* Selected line display */}
                    {filters.lineId && (
                        <div className="mt-3 p-3 bg-info bg-opacity-10 rounded">
                            <Row className="align-items-center">
                                <Col>
                                    <p className="mb-0">
                                        <strong>Selected Line:</strong> {filters.lineName}
                                    </p>
                                </Col>
                                <Col xs="auto">
                                    <Button
                                        variant="sm"
                                        size="sm"
                                        onClick={() => setFilters(prev => ({
                                            ...prev,
                                            lineId: null,
                                            lineName: ''
                                        }))}
                                    >
                                        ✕ Clear
                                    </Button>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Table */}
            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    {departmentsLoading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading departments...</span>
                            </Spinner>
                        </div>
                    ) : departments.length === 0 ? (
                        <div className="alert alert-danger m-3">
                            No departments found. Please check your connection or contact administrator.
                        </div>
                    ) : loading && filters.departmentId ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading payrolls...</span>
                            </Spinner>
                        </div>
                    ) : !filters.departmentId ? (
                        <div className="alert alert-warning m-3">
                            ⚠️ Please select a department to view payrolls
                        </div>
                    ) : payrolls.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No payrolls found for the selected department. Please create a new payroll to get started.
                        </div>
                    ) : paginatedPayrolls.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No payrolls match the selected filters.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>Month</th>
                                <th>Department</th>
                                <th className="text-end">Total Salary</th>
                                <th>Status</th>
                                <th>Create At</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedPayrolls.map(payroll => (
                                <tr key={payroll.id}>
                                    <td>
                                        <small className="text-muted">#{payroll.id}</small>
                                    </td>
                                    <td>
                                        <strong>
                                            {payroll.month
                                                ? new Date(payroll.month).toLocaleDateString('vi-VN', {
                                                    month: 'long',
                                                    year: 'numeric'
                                                })
                                                : 'N/A'
                                            }
                                        </strong>
                                    </td>
                                    <td>
                                        {payroll.department?.name || 'N/A'}
                                    </td>
                                    <td className="text-end">
                                        <strong>{formatCurrency(payroll.totalSalary)}</strong>
                                    </td>
                                    <td>
                                        <Badge bg={getStatusBadge(payroll.status)}>
                                            {getStatusLabel(payroll.status)}
                                        </Badge>
                                    </td>
                                    <td>{formatDate(payroll.createdAt)}</td>
                                    <td className="d-flex flex-wrap gap-2">
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

                                        {payroll.status && payroll.status.toLowerCase() === 'pending' && (
                                            <Link
                                                to={`/payroll/${payroll.id}/approve`}
                                                className="btn btn-sm btn-success"
                                            >
                                                ✓ Approve
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>

                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Pagination */}
            {filteredTotalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        <Pagination.First
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(1)}
                        />
                        <Pagination.Prev
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        />
                        {Array.from({ length: Math.min(filteredTotalPages, 5) }, (_, i) => {
                            const startPage = Math.max(1, currentPage - 2);
                            return startPage + i;
                        }).map(page => (
                            <Pagination.Item
                                key={page}
                                active={page === currentPage}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Pagination.Item>
                        ))}
                        <Pagination.Next
                            disabled={currentPage === filteredTotalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        />
                        <Pagination.Last
                            disabled={currentPage === filteredTotalPages}
                            onClick={() => setCurrentPage(filteredTotalPages)}
                        />
                    </Pagination>
                </div>
            )}
        </div>
    );
};

export default PayrollList;