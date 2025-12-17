import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import useDepartmentLineFilters from '../../hooks/useDepartmentLineFilters';
import { getAllDepartments } from '../../services/departmentService';
import
{
    createProduction,
    deleteProduction,
    getProductions,
    updateProduction
} from '../../services/moduleC/productionService';
import '../../styles/payroll.css';
import LineSelector from './LineSelector';

const ProductionManagement = () =>
{
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
        name: '',
        productCount: '',
        unitPrice: '',
        lineName: '',
        subLineName: '',
        workUnitName: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    // Line/SubLine/WorkUnit selection
    const deptLine = useDepartmentLineFilters();
    const currentPath = deptLine.filters.linePath || [];
    const selectedNode = useMemo(() => currentPath.length > 0 ? currentPath[currentPath.length - 1] : null, [currentPath]);
    const derivedNames = useMemo(() =>
    {
        if (!selectedNode) return { lineName: '', subLineName: '', workUnitName: '' };
        const lvl = selectedNode.level;
        const parent = currentPath.length >= 2 ? currentPath[currentPath.length - 2] : null;
        const grand = currentPath.length >= 3 ? currentPath[currentPath.length - 3] : null;
        if (lvl === 5)
        {
            return { lineName: grand?.name || '', subLineName: parent?.name || '', workUnitName: selectedNode.name };
        } else if (lvl === 4)
        {
            return { lineName: parent?.name || '', subLineName: selectedNode.name, workUnitName: '' };
        } else if (lvl === 3)
        {
            return { lineName: selectedNode.name, subLineName: '', workUnitName: '' };
        }
        return { lineName: '', subLineName: '', workUnitName: '' };
    }, [selectedNode, currentPath]);
    const applyDerivedNames = () =>
    {
        setForm(prev => ({ ...prev, ...derivedNames }));
    };

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
            if (deptId) filters.departmentId = deptId;
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
        await loadProductions({ departmentId: filterDeptId, month: filterMonth });
    };

    const handleClearFilter = async () =>
    {
        setFilterDeptId('');
        setFilterMonth('');
        await loadProductions({ departmentId: '', month: '' });
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
        // Require Work Unit selection
        // if (!selectedNode || selectedNode.level !== 5)
        // {
        //     setError('Please select a Work Unit (level 5)');
        //     return;
        // }
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
            if (Number.isNaN(year) || Number.isNaN(month))
            {
                setError('Invalid production month');
                return;
            }
            const lastDayDate = new Date(year, month, 0);
            const pad = (n) => n.toString().padStart(2, '0');
            const dop = `${year}-${pad(month)}-${pad(lastDayDate.getDate())}`;

            const payload = {
                department: { id: Number(form.departmentId) },
                name: form.name,
                dop: dop,
                productCount: Number(form.productCount),
                unitPrice: Number(form.unitPrice),
                lineName: derivedNames.lineName,
                subLineName: derivedNames.subLineName,
                workUnitName: derivedNames.workUnitName
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
            name: p.name || '',
            productCount: p.productCount != null ? String(p.productCount) : '',
            unitPrice: p.unitPrice != null ? String(p.unitPrice) : '',
            lineName: p.lineName || '',
            subLineName: p.subLineName || '',
            workUnitName: p.workUnitName || ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            departmentId: '',
            dopMonth: '',
            name: '',
            productCount: '',
            unitPrice: '',
            lineName: '',
            subLineName: '',
            workUnitName: ''
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
                                    <Form.Label>Department <span style={{ color: 'red' }}>*</span></Form.Label>
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
                                    <Form.Label>Production Month <span style={{ color: 'red' }}>*</span></Form.Label>
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
                                    <Form.Label>Production Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleFormChange}
                                        placeholder="e.g., Product A, Product B"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="gy-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Line / Sub Line / Work Unit<span style={{ color: 'red' }}>*</span></Form.Label>
                                    <div className="d-flex align-items-center gap-2">
                                        <Form.Select
                                            style={{ maxWidth: 260 }}
                                            value={deptLine.filters.departmentId || ''}
                                            onChange={(e) => { deptLine.handleDepartmentChange(e); setForm(prev => ({ ...prev, departmentId: e.target.value || '' })); }}
                                        >
                                            <option value="">-- Select Department --</option>
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </Form.Select>
                                        <Button
                                            type="button"
                                            variant="outline-primary"
                                            disabled={!deptLine.filters.departmentId}
                                            onClick={() => deptLine.setShowLineSelector(true)}
                                        >
                                            Select Unit
                                        </Button>
                                        <div className="small text-muted">
                                            {selectedNode ? (
                                                <>
                                                    Selected: <Badge bg="secondary">{currentPath.map(n => n.name).join(' / ')}</Badge>
                                                </>
                                            ) : 'No unit selected'}
                                        </div>
                                    </div>
                                    {deptLine.showLineSelector && (
                                        <div className="mt-3">
                                            <LineSelector
                                                departmentId={deptLine.selectedDeptForLines || deptLine.filters.departmentId}
                                                onLineSelected={(node, path) => { deptLine.handleLineSelected(node, path); }}
                                            />
                                        </div>
                                    )}
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="gy-3 mt-2">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Line Name <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control value={derivedNames.lineName} readOnly />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Sub Line Name <span style={{ color: 'red' }}>*</span></Form.Label>
                                    <Form.Control value={derivedNames.subLineName} readOnly />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Work Unit Name</Form.Label>
                                    <Form.Control value={derivedNames.workUnitName} readOnly />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="gy-3 mt-2">
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
                            <Button type="submit" disabled={saving} onClick={applyDerivedNames}>
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
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Line</th>
                                    <th>Sub Line</th>
                                    <th>Work Unit</th>
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
                                        <td>{p.name || '-'}</td>
                                        <td>{getDeptName(p.department?.id)}</td>
                                        <td>{p.lineName || '-'}</td>
                                        <td>{p.subLineName || '-'}</td>
                                        <td>{p.workUnitName || '-'}</td>
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