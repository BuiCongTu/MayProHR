import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import useDepartmentLineFilters from '../../hooks/useDepartmentLineFilters';
import
{
    createProductionLine,
    deleteProductionLine,
    getProductionLines,
    updateProductionLine
} from '../../services/moduleC/productionLineService';
import { createProduction } from '../../services/moduleC/productionService';
import '../../styles/payroll.css';
import LineSelector from './LineSelector';

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

    // New: Monthly Production creation state
    const deptLine = useDepartmentLineFilters();
    const [monthly, setMonthly] = useState({
        departmentId: '',
        month: '', // yyyy-MM
        productCount: '',
        unitPrice: ''
    });
    const [creatingProduction, setCreatingProduction] = useState(false);
    const [lastCreatedProduction, setLastCreatedProduction] = useState(null);

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

    // Keep monthly.departmentId in sync with selected department from hook
    useEffect(() =>
    {
        if (deptLine.filters.departmentId && monthly.departmentId !== String(deptLine.filters.departmentId))
        {
            setMonthly(prev => ({ ...prev, departmentId: String(deptLine.filters.departmentId) }));
        }
    }, [deptLine.filters.departmentId]);

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

    const handleMonthlyChange = (e) =>
    {
        const { name, value } = e.target;
        setMonthly(prev => ({ ...prev, [name]: value }));
    };

    // Compute mapping for selected line path to lineId/sublineId based on level logic 3/4/5
    const currentPath = deptLine.filters.linePath || [];
    const selectedNode = useMemo(() => currentPath.length > 0 ? currentPath[currentPath.length - 1] : null, [currentPath]);
    const derivedIds = useMemo(() =>
    {
        if (!selectedNode) return { lineId: '', sublineId: '' };
        const lvl = selectedNode.level;
        const parent = currentPath.length >= 2 ? currentPath[currentPath.length - 2] : null;
        const grand = currentPath.length >= 3 ? currentPath[currentPath.length - 3] : null;
        if (lvl === 5)
        {
            return { lineId: grand?.id ? String(grand.id) : '', sublineId: parent?.id ? String(parent.id) : '' };
        } else if (lvl === 4)
        {
            return { lineId: parent?.id ? String(parent.id) : '', sublineId: String(selectedNode.id) };
        } else if (lvl === 3)
        {
            return { lineId: String(selectedNode.id), sublineId: '' };
        }
        return { lineId: '', sublineId: '' };
    }, [selectedNode, currentPath]);

    const applyDerivedIdsToForm = () =>
    {
        setForm(prev => ({
            ...prev,
            lineId: derivedIds.lineId,
            sublineId: derivedIds.sublineId
        }));
    };

    const handleSubmit = async (e) =>
    {
        e.preventDefault();

        // If user selected via LineSelector, prefer derived ids
        if (derivedIds.lineId || derivedIds.sublineId)
        {
            applyDerivedIdsToForm();
        }

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

    const handleCreateMonthlyProduction = async (e) =>
    {
        e.preventDefault();
        if (!monthly.departmentId) { setError('Department is required'); return; }
        if (!monthly.month) { setError('Month is required'); return; }
        if (!monthly.productCount || Number(monthly.productCount) <= 0) { setError('Product count must be > 0'); return; }
        if (!monthly.unitPrice || Number(monthly.unitPrice) < 0) { setError('Unit price must be >= 0'); return; }
        try
        {
            setCreatingProduction(true);
            setError('');
            setInfo('');
            const dop = `${monthly.month}-01`;
            const payload = {
                department: { id: Number(monthly.departmentId) },
                productCount: Number(monthly.productCount),
                dop,
                unitPrice: Number(monthly.unitPrice)
            };
            const created = await createProduction(payload);
            setLastCreatedProduction(created);
            if (created?.id)
            {
                setForm(prev => ({ ...prev, productionId: String(created.id) }));
                setInfo(`Created Production #${created.id} for ${monthly.month}`);
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to create production');
        } finally
        {
            setCreatingProduction(false);
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

            {/* Create Monthly Production */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">Create Monthly Production</Card.Header>
                <Card.Body>
                    <Form onSubmit={handleCreateMonthlyProduction}>
                        <Row className="gy-3 align-items-end">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Department</Form.Label>
                                    <Form.Select
                                        value={deptLine.filters.departmentId || ''}
                                        onChange={(e) => deptLine.handleDepartmentChange(e)}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {deptLine.departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Month</Form.Label>
                                    <Form.Control type="month" name="month" value={monthly.month} onChange={handleMonthlyChange} />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Product Count</Form.Label>
                                    <Form.Control type="number" name="productCount" min="1" value={monthly.productCount} onChange={handleMonthlyChange} />
                                </Form.Group>
                            </Col>
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Unit Price</Form.Label>
                                    <Form.Control type="number" name="unitPrice" min="0" step="0.1" value={monthly.unitPrice} onChange={handleMonthlyChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3} className="text-end">
                                <Button type="submit" disabled={creatingProduction}>
                                    {creatingProduction ? 'Creating...' : 'Create Production'}
                                </Button>
                            </Col>
                        </Row>
                        {lastCreatedProduction && (
                            <div className="mt-2 small text-muted">
                                Created: # {lastCreatedProduction.id} • Count: {lastCreatedProduction.productCount} • Unit: {lastCreatedProduction.unitPrice} • DOP: {lastCreatedProduction.dop}
                            </div>
                        )}
                    </Form>
                </Card.Body>
            </Card>

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
                            <Col md={9}>
                                <Form.Group>
                                    <Form.Label>Department / Line / SubLine / WorkUnit</Form.Label>
                                    <div className="d-flex align-items-center gap-2">
                                        <Form.Select
                                            style={{ maxWidth: 260 }}
                                            value={deptLine.filters.departmentId || ''}
                                            onChange={(e) => deptLine.handleDepartmentChange(e)}
                                        >
                                            <option value="">-- Select Department --</option>
                                            {deptLine.departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </Form.Select>
                                        <Button
                                            type="button"
                                            variant="outline-primary"
                                            disabled={!deptLine.filters.departmentId}
                                            onClick={() => deptLine.setShowLineSelector(true)}
                                        >
                                            Select Line
                                        </Button>
                                        <div className="small text-muted">
                                            {selectedNode ? (
                                                <>
                                                    Selected: <Badge bg="secondary">{currentPath.map(n => n.name).join(' / ')}</Badge>
                                                </>
                                            ) : 'No line selected'}
                                        </div>
                                    </div>
                                    {deptLine.showLineSelector && (
                                        <div className="mt-3">
                                            <LineSelector
                                                departmentId={deptLine.selectedDeptForLines || deptLine.filters.departmentId}
                                                onLineSelected={deptLine.handleLineSelected}
                                            />
                                        </div>
                                    )}
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