import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { getAllDepartments } from '../../services/departmentService';
import { getUsersByDepartment } from '../../services/userService';

import
{
    createRecurringAllowance,
    getRecurringAllowancesByUser,
    toggleAllowance,
    updateRecurringAllowance
} from '../../services/moduleC/payrollService';
import '../../styles/payroll.css';

const EmplRecurAllowance = () =>
{
    const [departments, setDepartments] = useState([]);
    const [departmentsLoading, setDepartmentsLoading] = useState(true);
    const [departmentsError, setDepartmentsError] = useState('');

    const [editingId, setEditingId] = useState(null);

    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [employees, setEmployees] = useState([]);
    const [employeesLoading, setEmployeesLoading] = useState(false);

    const [selectedUserId, setSelectedUserId] = useState('');
    const [recurringList, setRecurringList] = useState([]);
    const [loadingRecurring, setLoadingRecurring] = useState(false);

    const [form, setForm] = useState({
        type: 'CHILD_CARE',
        amount: '',
        startMonth: '',
        endMonth: '',
        reason: '',
        isActive: true
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
                setDepartmentsError(err?.message || 'Failed to load departments');
            } finally
            {
                setDepartmentsLoading(false);
            }
        };
        loadDepartments();
    }, []);

    // Load employees when department change
    useEffect(() =>
    {
        const loadEmployees = async () =>
        {
            if (!selectedDeptId)
            {
                setEmployees([]);
                setSelectedUserId('');
                setRecurringList([]);
                return;
            }
            try
            {
                setEmployeesLoading(true);
                setError('');
                const data = await getUsersByDepartment(selectedDeptId);
                setEmployees(Array.isArray(data) ? data : []);
            } catch (err)
            {
                setError(err?.message || 'Failed to load employees');
                setEmployees([]);
            } finally
            {
                setEmployeesLoading(false);
            }
        };
        loadEmployees();
    }, [selectedDeptId]);

    // Khi user thay đổi: reset form + load danh sách recurring allowances
    useEffect(() =>
    {
        // reset form về trạng thái create
        setEditingId(null);
        setForm({
            type: 'CHILD_CARE',
            amount: '',
            startMonth: '',
            endMonth: '',
            reason: '',
            isActive: true
        });

        const loadRecurring = async () =>
        {
            if (!selectedUserId)
            {
                setRecurringList([]);
                return;
            }
            try
            {
                setLoadingRecurring(true);
                const data = await getRecurringAllowancesByUser(selectedUserId);
                setRecurringList(Array.isArray(data) ? data : []);
            } catch (err)
            {
                setError(err?.message || 'Failed to load recurring allowances');
                setRecurringList([]);
            } finally
            {
                setLoadingRecurring(false);
            }
        };

        loadRecurring();
    }, [selectedUserId]);

    const getUserName = () =>
    {
        const u = employees.find(e => String(e.id) === String(selectedUserId));
        return u?.fullName || '';
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
        if (!selectedUserId)
        {
            setError('Please select employee');
            return;
        }
        if (!form.amount || Number(form.amount) <= 0)
        {
            setError('Amount must be greater than 0');
            return;
        }
        if (!form.startMonth)
        {
            setError('Please select start month');
            return;
        }

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            const payload = {
                amount: Number(form.amount),
                type: form.type,
                startMonth: form.startMonth + '-01',
                endMonth: form.endMonth ? form.endMonth + '-01' : null,
                reason: form.reason,
                isActive: form.isActive
            };

            if (editingId == null)
            {
                // Create mới
                await createRecurringAllowance(selectedUserId, payload);
                setInfo('Recurring allowance created successfully.');
            } else
            {
                // Update
                await updateRecurringAllowance(editingId, payload);
                setInfo('Recurring allowance updated successfully.');
            }

            // reload list
            const data = await getRecurringAllowancesByUser(selectedUserId);
            setRecurringList(Array.isArray(data) ? data : []);

            // reset form về create mode
            setEditingId(null);
            setForm({
                type: 'CHILD_CARE',
                amount: '',
                startMonth: '',
                endMonth: '',
                reason: '',
                isActive: true
            });

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save allowance');
        } finally
        {
            setSaving(false);
        }
    };

    const handleToggle = async (allowanceId) =>
    {
        if (!selectedUserId) return;
        try
        {
            setError('');
            setInfo('');
            await toggleAllowance(allowanceId);
            const data = await getRecurringAllowancesByUser(selectedUserId);
            setRecurringList(Array.isArray(data) ? data : []);
            setInfo('Toggle allowance status successfully.');
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to toggle allowance');
        }
    };

    // Khi click vào row -> đổ data lên form để xem / edit
    const handleRowClick = (a) =>
    {
        setEditingId(a.id);
        setError('');
        setInfo('');
        setForm({
            type: a.type || 'OTHER',
            amount: a.amount != null ? String(a.amount) : '',
            startMonth: a.startMonth ? a.startMonth.substring(0, 7) : '',
            endMonth: a.endMonth ? a.endMonth.substring(0, 7) : '',
            reason: a.reason || '',
            isActive: !!a.isActive
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            type: 'CHILD_CARE',
            amount: '',
            startMonth: '',
            endMonth: '',
            reason: '',
            isActive: true
        });
    };


    return (
        <div className="payroll-list-container p-4">
            <h2>Employee Recurring Allowances</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                </div>
            )}

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Row className="gy-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Department</Form.Label>
                                {departmentsLoading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <Form.Select
                                        value={selectedDeptId}
                                        onChange={e =>
                                        {
                                            setSelectedDeptId(e.target.value || '');
                                            setSelectedUserId('');
                                            setRecurringList([]);
                                        }}
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

                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Employee</Form.Label>
                                {employeesLoading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <Form.Select
                                        value={selectedUserId}
                                        onChange={e =>
                                        {
                                            setSelectedUserId(e.target.value || '');
                                        }}
                                        disabled={!selectedDeptId || employees.length === 0}
                                    >
                                        <option value="">Select employee</option>
                                        {employees.map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.fullName}
                                            </option>
                                        ))}
                                    </Form.Select>
                                )}
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {selectedUserId && (
                <>
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="bg-light">
                            <h6 className="mb-0">New Recurring Allowance for {getUserName()}</h6>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Row className="gy-3">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Type</Form.Label>
                                            <Form.Select
                                                name="type"
                                                value={form.type}
                                                onChange={handleFormChange}
                                            >
                                                <option value="CHILD_CARE">Child Care</option>
                                                <option value="HAZARD">Hazard</option>
                                                <option value="POSITION">Position</option>
                                                <option value="SENIORITY">Seniority</option>
                                                <option value="TRAVEL">Travel</option>
                                                <option value="OTHER">Other</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Amount</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="amount"
                                                value={form.amount}
                                                onChange={handleFormChange}
                                                min="0"
                                                step="1000"
                                                placeholder="VNĐ"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Start month</Form.Label>
                                            <Form.Control
                                                type="month"
                                                name="startMonth"
                                                value={form.startMonth}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>End month</Form.Label>
                                            <Form.Control
                                                type="month"
                                                name="endMonth"
                                                value={form.endMonth}
                                                onChange={handleFormChange}
                                            />
                                            <Form.Text muted>Optional (leave empty for open-ended)</Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row className="mt-3">
                                    <Col>
                                        <Form.Group>
                                            <Form.Label>Reason / Note</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={2}
                                                name="reason"
                                                value={form.reason}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3} className="d-flex align-items-end">
                                        <Form.Check
                                            type="checkbox"
                                            id="allowance-active"
                                            label="Active"
                                            name="isActive"
                                            checked={form.isActive}
                                            onChange={handleFormChange}
                                        />
                                    </Col>
                                </Row>

                                <div className="mt-3 text-end">
                                    <Button type="submit" disabled={saving}>
                                        {saving ? 'Saving...' : (editingId ? 'Update Recurring Allowance' : 'Save Recurring Allowance')}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>

                    <Card className="shadow-sm">
                        <Card.Header className="bg-light">
                            <h6 className="mb-0">Existing Recurring Allowances</h6>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loadingRecurring ? (
                                <div className="text-center p-4">
                                    <Spinner animation="border" />
                                </div>
                            ) : recurringList.length === 0 ? (
                                <div className="alert alert-info m-3">
                                    No recurring allowances defined for this employee.
                                </div>
                            ) : (
                                <Table striped hover responsive className="mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Type</th>
                                            <th>Amount</th>
                                            <th>Start</th>
                                            <th>End</th>
                                            <th>Active</th>
                                            <th>Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recurringList.map(a => (
                                            <tr
                                                key={a.id}
                                                onClick={() => handleRowClick(a)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td>#{a.id}</td>
                                                <td>{a.type}</td>
                                                <td>{a.amount?.toLocaleString('vi-VN')} đ</td>
                                                <td>{a.startMonth}</td>
                                                <td>{a.endMonth || '-'}</td>
                                                <td>
                                                    <Button
                                                        size="sm"
                                                        variant={a.isActive ? 'outline-success' : 'outline-danger'}
                                                        onClick={() => handleToggle(a.id)}
                                                    >
                                                        {a.isActive ? 'Activate' : 'DeActivate'}
                                                    </Button>
                                                </td>
                                                <td>{a.reason || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </>
            )}
        </div>
    );
};

export default EmplRecurAllowance;