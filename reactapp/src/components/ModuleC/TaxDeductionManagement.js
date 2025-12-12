import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
    getTaxDeductions,
    createTaxDeduction,
    updateTaxDeduction,
    deleteTaxDeduction
} from '../../services/moduleC/taxDeductionService';
import '../../styles/payroll.css';

const TaxDeductionManagement = () => {
    const [deductions, setDeductions] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterActive, setFilterActive] = useState('all');
    const [filterType, setFilterType] = useState('');

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        deductionType: 'PERSONAL',
        deductionAmount: '',
        applicableFrom: '',
        applicableTo: '',
        isActive: true,
        description: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const loadDeductions = async () => {
        try {
            setLoading(true);
            setError('');
            let activeParam;
            if (filterActive === 'active') activeParam = true;
            else if (filterActive === 'inactive') activeParam = false;
            else activeParam = undefined;

            const data = await getTaxDeductions(activeParam, filterType);
            setDeductions(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || 'Failed to load tax deductions');
            setDeductions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDeductions();
    }, []);

    // submit
    const handleFilterSubmit = async (e) =>{
        e.preventDefault();
        await loadDeductions();
    };

    const handleFormChange = (e) =>
    {
        const { name, type, value, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();
        if (!form.deductionAmount || Number(form.deductionAmount) <= 0)
        {
            setError('deductionAmount must be greater than 0');
            return;
        }
        if (!form.deductionType)
        {
            setError('deductionType is required');
            return;
        }

        const actionLabel = editingId == null ? 'create' : 'update';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this tax deduction?`);
        if (!confirmed) return;

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            const payload = {
                deductionType: form.deductionType,
                deductionAmount: Number(form.deductionAmount),
                applicableFrom: form.applicableFrom || null,
                applicableTo: form.applicableTo || null,
                isActive: form.isActive,
                description: form.description
            };

            if (editingId == null)
            {
                await createTaxDeduction(payload);
                setInfo('Tax deduction created successfully.');
            } else
            {
                await updateTaxDeduction(editingId, payload);
                setInfo('Tax deduction updated successfully.');
            }

            await loadDeductions();
            handleCancelEdit();

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save tax deduction');
        } finally
        {
            setSaving(false);
        }
    };

    const handleRowClick = (d) =>
    {
        setEditingId(d.id);
        setError('');
        setInfo('');
        setForm({
            deductionType: d.deductionType || 'PERSONAL',
            deductionAmount: d.deductionAmount != null ? String(d.deductionAmount) : '',
            applicableFrom: d.applicableFrom || '',
            applicableTo: d.applicableTo || '',
            isActive: d.isActive != null ? d.isActive : true,
            description: d.description || ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            deductionType: 'PERSONAL',
            deductionAmount: '',
            applicableFrom: '',
            applicableTo: '',
            isActive: true,
            description: ''
        });
    };

    const handleDelete = async (id) =>
    {
        const confirmed = window.confirm('Are you sure you want to delete this tax deduction?');
        if (!confirmed) return;
        try
        {
            setError('');
            setInfo('');
            await deleteTaxDeduction(id);
            setInfo('Tax deduction deleted successfully.');
            await loadDeductions();
            if (editingId === id)
            {
                handleCancelEdit();
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to delete tax deduction');
        }
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Tax Deduction Management</h2>

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
                                    <Form.Label>Status</Form.Label>
                                    <Form.Select
                                        value={filterActive}
                                        onChange={e => setFilterActive(e.target.value)}
                                    >
                                        <option value="all">All</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Type </Form.Label>
                                    <Form.Select
                                        value={filterType}
                                        onChange={e => setFilterType(e.target.value)}
                                    >
                                        <option value="">All</option>
                                        <option value="PERSONAL">PERSONAL</option>
                                        <option value="DEPENDENT">DEPENDENT</option>
                                        <option value="INSURANCE">INSURANCE</option>
                                        <option value="OTHER">OTHER</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3} className="d-flex align-items-end">
                                <Button type="submit" variant="primary">
                                    Apply Filter
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
                        {editingId ? `Edit Tax Deduction #${editingId}` : 'Create New Tax Deduction'}
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
                                    <Form.Label>Type <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Select
                                        name="deductionType"
                                        value={form.deductionType}
                                        onChange={handleFormChange}
                                    >
                                        <option value="PERSONAL">PERSONAL</option>
                                        <option value="DEPENDENT">DEPENDENT</option>
                                        <option value="INSURANCE">INSURANCE</option>
                                        <option value="OTHER">OTHER</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Amount<span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="deductionAmount"
                                        value={form.deductionAmount}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="100000"
                                        placeholder="VNĐ"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Applicable from <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="applicableFrom"
                                        value={form.applicableFrom}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Applicable to <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="applicableTo"
                                        value={form.applicableTo}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        name="description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3} className="d-flex align-items-end">
                                <Form.Check
                                    type="checkbox"
                                    id="deduction-active"
                                    label="Active"
                                    name="isActive"
                                    checked={form.isActive}
                                    onChange={handleFormChange}
                                />
                            </Col>
                        </Row>
                        <div className="mt-3 text-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update Tax Deduction' : 'Save Tax Deduction')}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Table list */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Tax Deduction List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : deductions.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No tax deductions found.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>Type</th>
                                <th>Amount</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Active</th>
                                <th>Description</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {deductions.map(d => (
                                <tr
                                    key={d.id}
                                    onClick={() => handleRowClick(d)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>#{d.id}</td>
                                    <td>{d.deductionType}</td>
                                    <td>{d.deductionAmount?.toLocaleString('vi-VN')} đ</td>
                                    <td>{d.applicableFrom || '-'}</td>
                                    <td>{d.applicableTo || '-'}</td>
                                    <td>{d.isActive ? 'Yes' : 'No'}</td>
                                    <td>{d.description || '-'}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={(e) =>
                                            {
                                                e.stopPropagation();
                                                handleDelete(d.id);
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

export default TaxDeductionManagement;