import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
    getTaxBrackets,
    createTaxBracket,
    updateTaxBracket,
    deleteTaxBracket
} from '../../services/moduleC/taxBracketService';
import '../../styles/payroll.css';

const TaxBracketManagement = () =>
{
    const [brackets, setBrackets] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterActive, setFilterActive] = useState('all');

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        bracketNumber: '',
        fromIncome: '',
        toIncome: '',
        taxRate: '',
        isActive: true,
        description: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const loadBrackets = async () =>
    {
        try
        {
            setLoading(true);
            setError('');

            let activeParam;
            if (filterActive === 'active') activeParam = true;
            else if (filterActive === 'inactive') activeParam = false;
            else activeParam = undefined;

            const data = await getTaxBrackets(activeParam);
            setBrackets(Array.isArray(data) ? data : []);
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to load tax brackets');
            setBrackets([]);
        } finally
        {
            setLoading(false);
        }
    };

    useEffect(() =>
    {
        loadBrackets();
    }, []);


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

        if (!form.bracketNumber || Number(form.bracketNumber) <= 0)
        {
            setError('bracketNumber must be greater than 0');
            return;
        }
        if (!form.fromIncome || Number(form.fromIncome) <= 0)
        {
            setError('fromIncome must be greater than 0');
            return;
        }
        if (!form.toIncome || Number(form.toIncome) <= 0)
        {
            setError('toIncome must be greater than 0');
            return;
        }
        if (!form.taxRate || Number(form.taxRate) <= 0)
        {
            setError('taxRate must be greater than 0');
            return;
        }

        const actionLabel = editingId == null ? 'create' : 'update';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this tax bracket?`);
        if (!confirmed) return;

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            const payload = {
                bracketNumber: Number(form.bracketNumber),
                fromIncome: Number(form.fromIncome),
                toIncome: Number(form.toIncome),
                taxRate: Number(form.taxRate),
                isActive: form.isActive,
                description: form.description
            };

            if (editingId == null)
            {
                await createTaxBracket(payload);
                setInfo('Tax bracket created successfully.');
            } else
            {
                await updateTaxBracket(editingId, payload);
                setInfo('Tax bracket updated successfully.');
            }

            await loadBrackets();
            handleCancelEdit();

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save tax bracket');
        } finally
        {
            setSaving(false);
        }
    };

    const handleRowClick = (b) =>
    {
        setEditingId(b.id);
        setError('');
        setInfo('');
        setForm({
            bracketNumber: b.bracketNumber != null ? String(b.bracketNumber) : '',
            fromIncome: b.fromIncome != null ? String(b.fromIncome) : '',
            toIncome: b.toIncome != null ? String(b.toIncome) : '',
            taxRate: b.taxRate != null ? String(b.taxRate) : '',
            isActive: b.isActive != null ? b.isActive : true,
            description: b.description || ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            bracketNumber: '',
            fromIncome: '',
            toIncome: '',
            taxRate: '',
            isActive: true,
            description: ''
        });
    };

    const handleDelete = async (id) =>
    {
        const confirmed = window.confirm('Are you sure you want to delete this tax bracket?');
        if (!confirmed) return;
        try
        {
            setError('');
            setInfo('');
            await deleteTaxBracket(id);
            setInfo('Tax bracket deleted successfully.');
            await loadBrackets();
            if (editingId === id)
            {
                handleCancelEdit();
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to delete tax bracket');
        }
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Tax Bracket Management</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                </div>
            )}

            {/* Filter */}

            {/* Form create / edit */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        {editingId ? `Edit Tax Bracket #${editingId}` : 'Create New Tax Bracket'}
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
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Bracket Level <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="bracketNumber"
                                        value={form.bracketNumber}
                                        onChange={handleFormChange}
                                        min="1"
                                        step="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>From income <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="fromIncome"
                                        value={form.fromIncome}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1000000"
                                        placeholder="VND"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>To income <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="toIncome"
                                        value={form.toIncome}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1000000"
                                        placeholder="VND"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Tax rate (%) <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="taxRate"
                                        value={form.taxRate}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1"
                                        placeholder="e.g. 5 for 5%"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Form.Check
                                    type="checkbox"
                                    id="bracket-active"
                                    label="Active"
                                    name="isActive"
                                    checked={form.isActive}
                                    onChange={handleFormChange}
                                />
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
                        </Row>
                        <div className="mt-3 text-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update Tax Bracket' : 'Save Tax Bracket')}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Table list */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Tax Bracket List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : brackets.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No tax brackets found.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>No.</th>
                                <th>From</th>
                                <th>To</th>
                                <th>Rate (%)</th>
                                <th>Active</th>
                                <th>Description</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {brackets.map(b => (
                                <tr
                                    key={b.id}
                                    onClick={() => handleRowClick(b)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>#{b.id}</td>
                                    <td>{b.bracketNumber}</td>
                                    <td>{b.fromIncome?.toLocaleString('vi-VN')} đ</td>
                                    <td>{b.toIncome?.toLocaleString('vi-VN')} đ</td>
                                    <td>{b.taxRate}</td>
                                    <td>{b.isActive ? 'Yes' : 'No'}</td>
                                    <td>{b.description || '-'}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={(e) =>
                                            {
                                                e.stopPropagation();
                                                handleDelete(b.id);
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

export default TaxBracketManagement;