import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
    getProductionLines,
    createProductionLine,
    updateProductionLine,
    deleteProductionLine
} from '../../services/moduleC/productionLineService';
import '../../styles/payroll.css';

const ProductionLineManagement = () =>
{
    const [lines, setLines] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterProductionId, setFilterProductionId] = useState('');
    const [filterSublineId, setFilterSublineId] = useState('');

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        productionId: '',
        lineId: '',
        sublineId: '',
        countContribution: '',
        totalWorkingHours: '',
        productSalaryPerHour: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    const loadLines = async (override = {}) =>
    {
        try
        {
            setLoading(true);
            setError('');

            const productionId = override.productionId !== undefined ? override.productionId : filterProductionId;
            const sublineId = override.sublineId !== undefined ? override.sublineId : filterSublineId;

            const filters = {};
            if (productionId) filters.productionId = productionId;
            if (sublineId) filters.sublineId = sublineId;

            const data = await getProductionLines(filters);
            setLines(Array.isArray(data) ? data : []);
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to load production lines');
            setLines([]);
        } finally
        {
            setLoading(false);
        }
    };

    useEffect(() =>
    {
        loadLines();
    }, []);

    const handleFilterSubmit = async (e) =>
    {
        e.preventDefault();
        await loadLines({
            productionId: filterProductionId,
            sublineId: filterSublineId
        });
    };

    const handleClearFilter = async () =>
    {
        setFilterProductionId('');
        setFilterSublineId('');
        await loadLines({
            productionId: '',
            sublineId: ''
        });
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

        if (!form.productionId)
        {
            setError('productionId is required');
            return;
        }
        if (!form.lineId)
        {
            setError('lineId is required');
            return;
        }
        if (!form.sublineId)
        {
            setError('sublineId is required');
            return;
        }
        if (!form.countContribution || Number(form.countContribution) < 0)
        {
            setError('countContribution must be >= 0');
            return;
        }
        if (!form.totalWorkingHours || Number(form.totalWorkingHours) <= 0)
        {
            setError('totalWorkingHours must be > 0');
            return;
        }

        const actionLabel = editingId == null ? 'create' : 'update';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this production line?`);
        if (!confirmed) return;

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            const payload = {
                production: { id: Number(form.productionId) },
                line: { id: Number(form.lineId) },
                subline: { id: Number(form.sublineId) },
                countContribution: Number(form.countContribution),
                totalWorkingHours: Number(form.totalWorkingHours),
                productSalaryPerHour: form.productSalaryPerHour
                    ? Number(form.productSalaryPerHour)
                    : 0
            };

            if (editingId == null)
            {
                await createProductionLine(payload);
                setInfo('Production line created successfully.');
            } else
            {
                await updateProductionLine(editingId, payload);
                setInfo('Production line updated successfully.');
            }

            await loadLines();
            handleCancelEdit();

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save production line');
        } finally
        {
            setSaving(false);
        }
    };

    const handleRowClick = (pl) =>
    {
        setEditingId(pl.id);
        setError('');
        setInfo('');
        setForm({
            productionId: pl.production?.id != null ? String(pl.production.id) : '',
            lineId: pl.line?.id != null ? String(pl.line.id) : '',
            sublineId: pl.subline?.id != null ? String(pl.subline.id) : '',
            countContribution: pl.countContribution != null ? String(pl.countContribution) : '',
            totalWorkingHours: pl.totalWorkingHours != null ? String(pl.totalWorkingHours) : '',
            productSalaryPerHour: pl.productSalaryPerHour != null ? String(pl.productSalaryPerHour) : ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            productionId: '',
            lineId: '',
            sublineId: '',
            countContribution: '',
            totalWorkingHours: '',
            productSalaryPerHour: ''
        });
    };

    const handleDelete = async (id) =>
    {
        const confirmed = window.confirm('Are you sure you want to delete this production line?');
        if (!confirmed) return;
        try
        {
            setError('');
            setInfo('');
            await deleteProductionLine(id);
            setInfo('Production line deleted successfully.');
            await loadLines();
            if (editingId === id)
            {
                handleCancelEdit();
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to delete production line');
        }
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Production Line Management</h2>

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
                                    <Form.Label>Production ID</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={filterProductionId}
                                        onChange={e => setFilterProductionId(e.target.value)}
                                        min="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Subline ID</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={filterSublineId}
                                        onChange={e => setFilterSublineId(e.target.value)}
                                        min="1"
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
                        {editingId ? `Edit Production Line #${editingId}` : 'Create New Production Line'}
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
                                    <Form.Label>Production ID </Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="productionId"
                                        value={form.productionId}
                                        onChange={handleFormChange}
                                        min="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Line ID</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="lineId"
                                        value={form.lineId}
                                        onChange={handleFormChange}
                                        min="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Subline ID</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="sublineId"
                                        value={form.sublineId}
                                        onChange={handleFormChange}
                                        min="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Count Contribution</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="countContribution"
                                        value={form.countContribution}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="1"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="gy-3 mt-2">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Total Working Hours</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="totalWorkingHours"
                                        value={form.totalWorkingHours}
                                        onChange={handleFormChange}
                                        min="1"
                                        step="1"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Product Salary / Hour</Form.Label>
                                    <Form.Control
                                        type="number"
                                        name="productSalaryPerHour"
                                        value={form.productSalaryPerHour}
                                        onChange={handleFormChange}
                                        min="0"
                                        step="0.0001"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="mt-3 text-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update Production Line' : 'Save Production Line')}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

            {/* Table list */}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Production Line List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : lines.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No production line records found.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>Production ID</th>
                                <th>Line ID</th>
                                <th>Subline ID</th>
                                <th>Count Contribution</th>
                                <th>Total Working Hours</th>
                                <th>Product Salary / Hour</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lines.map(pl => (
                                <tr
                                    key={pl.id}
                                    onClick={() => handleRowClick(pl)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>#{pl.id}</td>
                                    <td>{pl.production?.id}</td>
                                    <td>{pl.line?.id}</td>
                                    <td>{pl.subline?.id}</td>
                                    <td>{pl.countContribution}</td>
                                    <td>{pl.totalWorkingHours}</td>
                                    <td>{pl.productSalaryPerHour}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={(e) =>
                                            {
                                                e.stopPropagation();
                                                handleDelete(pl.id);
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

export default ProductionLineManagement;