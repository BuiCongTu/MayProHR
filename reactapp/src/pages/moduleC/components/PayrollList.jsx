import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Card, Form, Row, Col, Pagination, Alert, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../../styles/payroll.css';

const BASE_API = 'http://localhost:9999/api';

const PayrollList = () => {
    const [payrolls, setPayrolls] = useState([]);
    const [filteredPayrolls, setFilteredPayrolls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [filters, setFilters] = useState({
        status: '',
        department: '',
        yearMonth: ''
    });

    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchPayrolls();
        fetchDepartments();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [payrolls, filters, currentPage, pageSize]);

    const fetchPayrolls = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${BASE_API}/payroll/list`, {
                params: { page: currentPage - 1, size: pageSize }
            });

            if (response.data.success) {
                setPayrolls(response.data.data || []);
            } else {
                setPayrolls([]);
            }
        } catch (err) {
            console.error('Error loading payroll:', err);
            setError('Unable to load payroll list');
            setPayrolls([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const response = await axios.get(`${BASE_API}/department`);
            setDepartments(response.data || []);
        } catch (err) {
            console.error('Error loading department:', err);
        }
    };

    const applyFilters = () => {
        let filtered = payrolls;

        if (filters.status) {
            filtered = filtered.filter(p => p.status === filters.status);
        }

        if (filters.department) {
            filtered = filtered.filter(p => p.departmentName === filters.department);
        }

        if (filters.yearMonth) {
            filtered = filtered.filter(p =>
                p.month && p.month.startsWith(filters.yearMonth)
            );
        }

        setFilteredPayrolls(filtered);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        setCurrentPage(1);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            pending: 'warning',
            balanced: 'info',
            approved: 'success',
            rejected: 'danger'
        };
        return statusMap[status] || 'secondary';
    };

    const getStatusLabel = (status) => {
        const labels = {
            pending: 'Pending',
            balanced: 'Balance',
            approved: 'Approved',
            rejected: 'Reject'
        };
        return labels[status] || status;
    };

    const formatCurrency = (value) => {
        if (!value) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN');
    };

    const paginatedPayrolls = filteredPayrolls.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const totalPages = Math.ceil(filteredPayrolls.length / pageSize);

    return (
        <div className="payroll-list-container p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2> Payroll List</h2>
                <Link to="/payroll/create" className="btn btn-primary">
                    ➕ Create new
                </Link>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Filters */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0"> Filters</h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Status</Form.Label>
                                <Form.Select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
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
                                <Form.Label>Department</Form.Label>
                                <Form.Select
                                    name="department"
                                    value={filters.department}
                                    onChange={handleFilterChange}
                                >
                                    <option value="">All</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.name}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Year month</Form.Label>
                                <Form.Control
                                    type="month"
                                    name="yearMonth"
                                    value={filters.yearMonth}
                                    onChange={handleFilterChange}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>&nbsp;</Form.Label>
                                <Button
                                    variant="outline-secondary"
                                    className="w-100"
                                    onClick={() => {
                                        setFilters({ status: '', department: '', yearMonth: '' });
                                        setCurrentPage(1);
                                    }}
                                >
                                    Clear filters
                                </Button>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Table */}
            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </Spinner>
                        </div>
                    ) : paginatedPayrolls.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No payrolls found. Please create a new payroll to get started.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>Month</th>
                                <th>Department</th>
                                <th>Total Salary</th>
                                <th>Status</th>
                                <th>Create At</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedPayrolls.map(payroll => (
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
                                    <td className="text-end">
                                        <strong>{formatCurrency(payroll.totalSalary)}</strong>
                                    </td>
                                    <td>
                                        <Badge bg={getStatusBadge(payroll.status)}>
                                            {getStatusLabel(payroll.status)}
                                        </Badge>
                                    </td>
                                    <td>{formatDate(payroll.createdDate)}</td>
                                    <td>
                                        <Link
                                            to={`/payroll/${payroll.payrollId}`}
                                            className="btn btn-sm btn-info me-2"
                                        >
                                            ️ View
                                        </Link>
                                        {payroll.status === 'pending' && (
                                            <Link
                                                to={`/payroll/${payroll.payrollId}/approve`}
                                                className="btn btn-sm btn-success"
                                            >
                                                Approved
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
            {totalPages > 1 && (
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <Pagination.Item
                                key={page}
                                active={page === currentPage}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </Pagination.Item>
                        ))}
                        <Pagination.Next
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        />
                        <Pagination.Last
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(totalPages)}
                        />
                    </Pagination>
                </div>
            )}
        </div>
    );
};

export default PayrollList;