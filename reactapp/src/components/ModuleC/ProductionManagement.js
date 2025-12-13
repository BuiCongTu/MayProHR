import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { getAllDepartments } from '../../services/departmentService';
import {
    getProductions,
    createProduction,
    updateProduction,
    deleteProduction
} from '../../services/moduleC/productionService';
import '../../styles/payroll.css';

const ProductionManagement = () =>{
    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);

    const [productions, setProductions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterDeptId, setFilterDeptId] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        departmentId: '',
        dopMonth: '',
        productCount: '',
        unitPrice: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    // Load departments
    useEffect(() =>
    {
        const loadDepartments = async () =>
        {
            try
            {
                setDepartmentsLoading(true);
                const res = await getAllDepartments();
                const data = res?.data || res || [];
                setDepartments(data);
            } catch (err)
            {
                setError(err?.message || 'Failed to load departments');
            } finally
            {
                setDepartmentsLoading(false);
            }
        };
        loadDepartments();
    }, []);

    const loadProductions = async (override = {}) =>
    {
        try
        {
            setLoading(true);
            setError('');
            const deptId = override.departmentId !== undefined ? override.departmentId : filterDeptId;
            const monthValue = override.month !== undefined ? override.month : filterMonth;

            const filters = {};
            if (deptId) filters.departmentId = deptId``;
            if (monthValue)
            {
                // filterMonth dạng YYYY-MM
                const [yearStr, monthStr] = filterMonth.split('-');
                const year = Number(yearStr);
                const month = Number(monthStr);
                if (!Number.isNaN(year) && !Number.isNaN(month))
                {
                    const firstDay = new Date(year, month - 1, 1);
                    const lastDay = new Date(year, month, 0);

                    const pad = (n) => n.toString().padStart(2, '0');
                    const fromDate = `${year}-${pad(month)}-${pad(firstDay.getDate())}`;
                    const toDate = `${year}-${pad(month)}-${pad(lastDay.getDate())}`;

                    filters.fromDate = fromDate;
                    filters.toDate = toDate;
                }
            }

            const data = await getProductions(filters);
            setProductions(Array.isArray(data) ? data : []);
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to load productions');
            setProductions([]);
        } finally
        {
            setLoading(false);
        }
    };


    useEffect(() =>
    {
        loadProductions();
    }, []);

    const handleFilterSubmit = async (e) =>
    {
        e.preventDefault();
        await loadProductions({departmentId: filterDeptId, month: filterMonth});
    };

    const handleClearFilter = async () =>
    {
        setFilterDeptId('');
        setFilterMonth('');
        await loadProductions({departmentId: '', month: ''});
    };

    const handleFormChange = (e) =>
    {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();

        if (!form.departmentId)
        {
            setError('Please select department');
            return;
        }
        if (!form.dopMonth)
        {
            setError('Please select production month');
            return;
        }
        if (!form.productCount || Number(form.productCount) < 0)
        {
            setError('productCount must be >= 0');
            return;
        }
        if (!form.unitPrice || Number(form.unitPrice) < 0)
        {
            setError('unitPrice must be >= 0');
            return;
        }

        const actionLabel = editingId == null ? 'create' : 'update';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this production record?`);
        if (!confirmed) return;

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            // tinh dop lay ngay cuoi thang
            const [yearStr, monthStr] = form.dopMonth.split('-');
            const year = Number(yearStr);
            const month = Number(monthStr);
            if (Number.isNaN(year) || Number.isNaN(month)) {
                setError('Invalid production month');
                return;
            }
            const lastDayDate = new Date(year, month, 0);
            const pad = (n) => n.toString().padStart(2, '0');
            const dop = `${year}-${pad(month)}-${pad(lastDayDate.getDate())}`;

            const payload = {
                department: { id: Number(form.departmentId) },
                dop: dop,
                productCount: Number(form.productCount),
                unitPrice: Number(form.unitPrice)
            };

            if (editingId == null)
            {

                await createProduction(payload);
                setInfo('Production created successfully.');

            } else
            {
                await updateProduction(editingId, payload);
                setInfo('Production updated successfully.');
            }

            await loadProductions();
            handleCancelEdit();

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save production');
        } finally
        {
            setSaving(false);
        }
    };

    const handleRowClick = (p) =>
    {
        setEditingId(p.id);
        setError('');
        setInfo('');
        setForm({
            departmentId: p.department?.id != null ? String(p.department.id) : '',
            dopMonth: p.dop ? p.dop.substring(0, 7) : '',
            productCount: p.productCount != null ? String(p.productCount) : '',
            unitPrice: p.unitPrice != null ? String(p.unitPrice) : ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            departmentId: '',
            dopMonth: '',
            productCount: '',
            unitPrice: ''
        });
    };

    const handleDelete = async (id) =>
    {
        const confirmed = window.confirm('Are you sure you want to delete this production record?');
        if (!confirmed) return;
        try
        {
            setError('');
            setInfo('');
            await deleteProduction(id);
            setInfo('Production deleted successfully.');
            await loadProductions();
            if (editingId === id)
            {
                handleCancelEdit();
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to delete production');
        }
    };

    const getDeptName = (deptId) =>
    {
        const d = departments.find(dep => dep.id === deptId);
        return d?.name || '-';
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Monthly Production Summary</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                </div>
            )}

            {/* Filter */}
            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Form onSubmit={handleFilterSubmit}>
                        <Row className="gy-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Department</Form.Label>
                                    {departmentsLoading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Form.Select
                                            value={filterDeptId}
                                            onChange={e => setFilterDeptId(e.target.value || '')}
                                        >
                                            <option value="">All departments</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Month</Form.Label>
                                    <Form.Control
                                        type="month"
                                        value={filterMonth}
                                        onChange={e => setFilterMonth(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} className="d-flex align-items-end">
                                <Button type="submit" variant="primary" className="me-2">
                                    Apply Filter
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={handleClearFilter}
                                >
                                    Clear Filter
                                </Button>
                            </Col>
                        </Row>
                    </Form>
                </Card.Body>
            </Card>

            {/* Form create / edit */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        {editingId ? `Edit Monthly Summary #${editingId}` : 'Create Monthly Production Summary'}
                    </h6>
                    {editingId && (
                        <Button variant="outline-secondary" size="sm" onClick={handleCancelEdit}>
                            Cancel Edit
                        </Button>
                    )}
                </Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row className="gy-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Department</Form.Label>
                                    {departmentsLoading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Form.Select
                                            name="departmentId"
                                            value={form.departmentId}
                                            onChange={handleFormChange}
                                        >
                                            <option value="">Select department</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Production Month</Form.Label>
                                    <Form.Control
                                        type="month"
                                        name="dopMonth"
                                        value={form.dopMonth}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Product Count <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="productCount"
                                        value={form.productCount}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Unit Price <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="unitPrice"
                                        value={form.unitPrice}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1"
                                        placeholder="VND"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="mt-3 text-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update Production' : 'Save Production')}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Table list */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Production List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : productions.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No production records found.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Department</th>
                                <th>Product Count</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {productions.map(p => (
                                <tr
                                    key={p.id}
                                    onClick={() => handleRowClick(p)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>#{p.id}</td>
                                    <td>{p.dop}</td>
                                    <td>{getDeptName(p.department?.id)}</td>
                                    <td>{p.productCount}</td>
                                    <td>{p.unitPrice?.toLocaleString('vi-VN')} đ</td>
                                    <td>
                                        {(p.productCount != null && p.unitPrice != null)
                                            ? (p.productCount * Number(p.unitPrice)).toLocaleString('vi-VN') + ' đ'
                                            : '-'}
                                    </td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={(e) =>
                                            {
                                                e.stopPropagation();
                                                handleDelete(p.id);
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </div>
    );

};
export default ProductionManagement;