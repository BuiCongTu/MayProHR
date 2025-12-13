import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import {
    getHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from '../../services/moduleC/holidayService';
import '../../styles/payroll.css';
const HolidayManagement = () =>{
    const [holidays, setHolidays] = useState([]);
    const [loading, setLoading] = useState(false);

    const [filterYear, setFilterYear] = useState('');
    const [filterMonth, setFilterMonth] = useState('');

    const [editingId, setEditingId] = useState(null);

    const [form, setForm] = useState({
        holidayDate: '',
        holidayName: '',
        isPaid: true,
        note: ''
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    //load holidays
    const loadHolidays = async () => {
        try {
            setLoading(true);
            setError('');
            const year = filterYear ? Number(filterYear) : undefined;
            const month = filterMonth ? Number(filterMonth) : undefined;
            const data = await getHolidays(year, month);
            setHolidays(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load holidays');
            setHolidays([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadHolidays();
    }, []);

    const handleFilterSubmit = async (e) =>
    {
        e.preventDefault();
        await loadHolidays();
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
        if (!form.holidayDate)
        {
            setError('Please select holiday date');
            return;
        }
        if (!form.holidayName.trim())
        {
            setError('Please enter holiday name');
            return;
        }

        const actionLabel = editingId == null ? 'create' : 'update';
        const confirmed = window.confirm(`Are you sure you want to ${actionLabel} this holiday?`);
        if (!confirmed) return;

        try
        {
            setSaving(true);
            setError('');
            setInfo('');

            const payload = {
                holidayDate: form.holidayDate,
                holidayName: form.holidayName,
                isPaid: form.isPaid,
                note: form.note
            };

            if (editingId == null)
            {
                await createHoliday(payload);
                setInfo('Holiday created successfully.');
            } else
            {
                await updateHoliday(editingId, payload);
                setInfo('Holiday updated successfully.');
            }

            await loadHolidays();
            handleCancelEdit();

        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to save holiday');
        } finally
        {
            setSaving(false);
        }
    };

    const handleRowClick = (h) =>
    {
        setEditingId(h.id);
        setError('');
        setInfo('');
        setForm({
            holidayDate: h.holidayDate,
            holidayName: h.holidayName || '',
            isPaid: h.isPaid != null ? h.isPaid : true,
            note: h.note || ''
        });
    };

    const handleCancelEdit = () =>
    {
        setEditingId(null);
        setForm({
            holidayDate: '',
            holidayName: '',
            isPaid: true,
            note: ''
        });
    };

    const handleDelete = async (id) =>
    {
        const confirmed = window.confirm('Are you sure you want to delete this holiday?');
        if (!confirmed) return;
        try
        {
            setError('');
            setInfo('');
            await deleteHoliday(id);
            setInfo('Holiday deleted successfully.');
            await loadHolidays();
            if (editingId === id)
            {
                handleCancelEdit();
            }
        } catch (err)
        {
            setError(err?.response?.data?.message || err.message || 'Failed to delete holiday');
        }
    };

    return (
        <div className="payroll-list-container p-4">
            <h2>Holiday Management</h2>

            {(error || info) && (
                <div className="mb-3">
                    {error && <Alert variant="danger">{error}</Alert>}
                    {info && <Alert variant="success">{info}</Alert>}
                </div>
            )}

            {/*//filter*/}
            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Form onSubmit={handleFilterSubmit}>
                        <Row className="gy-3">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Year</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="2000"
                                        max="2100"
                                        value={filterYear}
                                        onChange={e => setFilterYear(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Month</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={filterMonth}
                                        onChange={e => setFilterMonth(e.target.value)}
                                    />
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

        {/*    create/ edit form*/}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                        {editingId ? `Edit Holiday #${editingId}` : 'Create New Holiday'}
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
                                    <Form.Label>Date</Form.Label>
                                    <Form.Control
                                        type="date"
                                        name="holidayDate"
                                        value={form.holidayDate}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="holidayName"
                                        value={form.holidayName}
                                        onChange={handleFormChange}
                                        placeholder="Holiday name"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Form.Check
                                    type="checkbox"
                                    id="holiday-ispaid"
                                    label="Paid"
                                    name="isPaid"
                                    checked={form.isPaid}
                                    onChange={handleFormChange}
                                />
                            </Col>
                        </Row>
                        <Row className="mt-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label>Note</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        name="note"
                                        value={form.note}
                                        onChange={handleFormChange}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="mt-3 text-end">
                            <Button type="submit" disabled={saving}>
                                {saving ? 'Saving...' : (editingId ? 'Update Holiday' : 'Save Holiday')}
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
            </Card>

        {/*    list holidays*/}
            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Holiday List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4">
                            <Spinner animation="border" />
                        </div>
                    ) : holidays.length === 0 ? (
                        <div className="alert alert-info m-3">
                            No holidays found.
                        </div>
                    ) : (
                        <Table striped hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Name</th>
                                <th>Paid</th>
                                <th>Note</th>
                                <th>Action</th>
                            </tr>
                            </thead>
                            <tbody>
                            {holidays.map(h => (
                                <tr
                                    key={h.id}
                                    onClick={() => handleRowClick(h)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>#{h.id}</td>
                                    <td>{h.holidayDate}</td>
                                    <td>{h.holidayName}</td>
                                    <td>{h.isPaid ? 'Yes' : 'No'}</td>
                                    <td>{h.note || '-'}</td>
                                    <td>
                                        <Button
                                            size="sm"
                                            variant="outline-danger"
                                            onClick={(e) =>
                                            {
                                                e.stopPropagation();
                                                handleDelete(h.id);
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
    )
}

export default HolidayManagement;