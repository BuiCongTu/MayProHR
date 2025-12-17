import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import useDepartmentLineFilters from '../../hooks/useDepartmentLineFilters';
import
{
  createOrUpdateEmployeeProduction,
  deleteEmployeeProduction,
  getEmployeeProductionByDepartmentMonth
} from '../../services/moduleC/empProductionService';
import { getProductionsByStructureMonth } from '../../services/moduleC/productionService';
import { getUsersByStructure } from '../../services/userService';
import '../../styles/payroll.css';
import LineSelector from './LineSelector';

const EmployeeProductionInput = () =>
{
  // Sử dụng hook như UserList
  const {
    departments,
    departmentsLoading,
    departmentsError,
    filters: deptLineFilters,
    handleDepartmentChange,
    handleLineSelected,
    showLineSelector,
    setShowLineSelector,
    selectedDeptForLines,
  } = useDepartmentLineFilters();

  const [productions, setProductions] = useState([]);
  const [productionsLoading, setProductionsLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [employeeProductions, setEmployeeProductions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initialize filterMonth to last month (YYYY-MM format)
  const [filterMonth, setFilterMonth] = useState(() =>
  {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = lastMonth.getFullYear();
    const month = String(lastMonth.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const [form, setForm] = useState({
    productionId: '',
    userId: '',
    productCount: '',
    unitPrice: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Load productions when department and month selected
  useEffect(() =>
  {
    if (!deptLineFilters.departmentId || !filterMonth) return;
    const loadProductions = async () =>
    {
      try
      {
        setProductionsLoading(true);
        console.log('[EmployeeProductionInput] Fetch productions with filters', {
          departmentId: deptLineFilters.departmentId,
          month: filterMonth
        });
        const res = await getProductionsByStructureMonth(deptLineFilters.departmentId, filterMonth);
        const data = Array.isArray(res) ? res : (res?.data || []);
        console.log('[EmployeeProductionInput] Productions loaded:', data.length, 'First production:', data[0]);
        setProductions(data);
      } catch (err)
      {
        console.error('Error loading productions:', err);
        setProductions([]);
      } finally
      {
        setProductionsLoading(false);
      }
    };
    loadProductions();
  }, [deptLineFilters.departmentId, filterMonth]);

  // Load users (ProductBased) theo department + line/subline/workunit giống UserList
  useEffect(() =>
  {
    if (!deptLineFilters.departmentId) return;
    const loadUsers = async () =>
    {
      try
      {
        setUsersLoading(true);
        console.log('[EmployeeProductionInput] Fetch users with filters', {
          departmentId: deptLineFilters.departmentId,
          lineId: deptLineFilters.lineId || undefined
        });
        const data = await getUsersByStructure({
          departmentId: deptLineFilters.departmentId,
          lineId: deptLineFilters.lineId || undefined
        });
        console.log('[EmployeeProductionInput] Raw users length:', Array.isArray(data) ? data.length : 0);
        const productBasedUsers = (Array.isArray(data) ? data : []).filter(
          (u) => u.salaryType === 'ProductBased'
        );
        console.log('[EmployeeProductionInput] ProductBased users length:', productBasedUsers.length);
        setUsers(productBasedUsers);
      } catch (err)
      {
        console.error('Error loading users:', err);
        setUsers([]);
      } finally
      {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, [deptLineFilters.departmentId, deptLineFilters.lineId]);

  // Load employee productions
  const loadEmployeeProductions = async () =>
  {
    if (!deptLineFilters.departmentId || !filterMonth)
    {
      setEmployeeProductions([]);
      return;
    }

    try
    {
      setLoading(true);
      setError('');
      const data = await getEmployeeProductionByDepartmentMonth(deptLineFilters.departmentId, filterMonth);
      setEmployeeProductions(data || []);
    } catch (err)
    {
      setError(err?.message || 'Failed to load employee productions');
      setEmployeeProductions([]);
    } finally
    {
      setLoading(false);
    }
  };

  useEffect(() =>
  {
    loadEmployeeProductions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptLineFilters.departmentId, filterMonth]);

  const resetForm = () =>
  {
    setForm({
      productionId: '',
      userId: '',
      productCount: '',
      unitPrice: ''
    });
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) =>
  {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!form.productionId || !form.userId || !form.productCount)
    {
      setError('Please fill in all required fields');
      return;
    }

    try
    {
      setSaving(true);
      console.log('[EmployeeProductionInput] Submit - form:', form);
      console.log('[EmployeeProductionInput] Selected production:', selectedProduction);
      console.log('[EmployeeProductionInput] Selected user:', users.find(u => u.id === parseInt(form.userId)));

      const payload = {
        production: { id: parseInt(form.productionId) },
        employee: { id: parseInt(form.userId) },
        productCount: parseInt(form.productCount),
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : null
      };

      console.log('[EmployeeProductionInput] Payload:', JSON.stringify(payload));

      const response = await createOrUpdateEmployeeProduction(payload);
      console.log('[EmployeeProductionInput] API Response:', response);

      setInfo('Employee production saved successfully');
      resetForm();
      loadEmployeeProductions();
    } catch (err)
    {
      console.error('[EmployeeProductionInput] Error:', err);
      setError(err?.message || 'Failed to save employee production');
    } finally
    {
      setSaving(false);
    }
  };

  const handleDelete = async (id) =>
  {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try
    {
      setError('');
      setInfo('');
      await deleteEmployeeProduction(id);
      setInfo('Employee production deleted successfully');
      loadEmployeeProductions();
    } catch (err)
    {
      setError(err?.message || 'Failed to delete employee production');
    }
  };

  const selectedProduction = productions.find(p => p.id === parseInt(form.productionId));

  return (
    <div className="payroll-container">
      <Card className="mb-4">
        <Card.Header>
          <h4>Employee Production Input</h4>
          <p className="text-muted mb-0">Input monthly production quantities for ProductBased employees</p>
        </Card.Header>
        <Card.Body>
          {(departmentsError || error) && (
            <Alert variant="danger" onClose={() => setError('')} dismissible>
              {departmentsError || error}
            </Alert>
          )}
          {info && <Alert variant="success" onClose={() => setInfo('')} dismissible>{info}</Alert>}

          {/* Filters */}
          <Row className="mb-4">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Department <span className="text-danger">*</span></Form.Label>
                <Form.Select
                  value={deptLineFilters.departmentId || ''}
                  onChange={(e) => { handleDepartmentChange(e); resetForm(); }}
                  disabled={departmentsLoading}
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Month <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Line/SubLine/WorkUnit selector */}
          {deptLineFilters.departmentId && (
            <div className="mb-3">
              <div className="p-2 border rounded bg-light d-flex flex-wrap align-items-center gap-2">
                <div className="fw-semibold">Path:</div>
                <Button
                  variant="link"
                  className="p-0"
                  disabled
                >
                  {deptLineFilters.departmentName || 'Select Department'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {deptLineFilters.linePath?.[0]?.name || 'Line'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {deptLineFilters.linePath?.[deptLineFilters.linePath.length - 2]?.name || 'Sub Line'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {deptLineFilters.linePath?.[deptLineFilters.linePath.length - 1]?.name || 'Work Unit'}
                </Button>

                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setShowLineSelector(true)}
                >
                  Choose Line / Sub Line / Work Unit
                </Button>
                {deptLineFilters.lineId && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => handleLineSelected(null)}
                  >
                    Clear line filter
                  </Button>
                )}
              </div>

              {showLineSelector && selectedDeptForLines && (
                <div className="mt-3">
                  <LineSelector
                    departmentId={selectedDeptForLines}
                    onLineSelected={handleLineSelected}
                  />
                </div>
              )}
            </div>
          )}

          {deptLineFilters.departmentId && filterMonth && (
            <>
              {/* Input Form */}
              <Card className="mb-4">
                <Card.Header>
                  <h5>Add/Update Employee Production</h5>
                </Card.Header>
                <Card.Body>
                  <Form onSubmit={handleSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Production <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            value={form.productionId}
                            onChange={(e) =>
                            {
                              const prodId = e.target.value;
                              setForm({ ...form, productionId: prodId });
                              const prod = productions.find(p => String(p.id) === prodId);
                              console.log('[EmployeeProductionInput] Production selected:', prodId, 'Object:', prod);
                            }}
                            disabled={productionsLoading}
                            required
                          >
                            <option value="">Select Production</option>
                            {productions
                              .filter(p => p.dop && p.dop.startsWith(filterMonth))
                              .map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name || 'Production'} - {p.dop} (Count: {p.productCount}, Price: {p.unitPrice})
                                </option>
                              ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Employee <span className="text-danger">*</span></Form.Label>
                          <Form.Select
                            value={form.userId}
                            onChange={(e) =>
                            {
                              const uid = e.target.value;
                              setForm({ ...form, userId: uid });
                              const user = users.find(u => String(u.id) === uid);
                              console.log('[EmployeeProductionInput] User selected:', uid, 'Object:', user);
                            }}
                            disabled={usersLoading}
                            required
                          >
                            <option value="">Select Employee</option>
                            {users.map(u => (
                              <option key={u.id} value={String(u.id)}>
                                {u.fullName} ({u.id})
                              </option>
                            ))}
                          </Form.Select>
                          {!usersLoading && users.length === 0 && (
                            <div className="form-text text-muted">
                              No ProductBased employees found for current department/line filters.
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Product Count <span className="text-danger">*</span></Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            value={form.productCount}
                            onChange={(e) => setForm({ ...form, productCount: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Unit Price (Optional)
                            {selectedProduction && (
                              <small className="text-muted ms-2">
                                Default: {selectedProduction.unitPrice?.toLocaleString()}
                              </small>
                            )}
                          </Form.Label>
                          <Form.Control
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.unitPrice}
                            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                            placeholder={selectedProduction?.unitPrice || 'Leave empty to use default'}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <div className="d-flex gap-2">
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? <><Spinner size="sm" /> Saving...</> : 'Save'}
                      </Button>
                      <Button type="button" variant="secondary" onClick={resetForm}>
                        Clear
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>

              {/* List */}
              <Card>
                <Card.Header>
                  <h5>Employee Productions for {filterMonth}</h5>
                </Card.Header>
                <Card.Body>
                  {loading ? (
                    <div className="text-center py-4">
                      <Spinner animation="border" />
                    </div>
                  ) : employeeProductions.length === 0 ? (
                    <Alert variant="info">No employee productions found for this month.</Alert>
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Full Name</th>
                          <th>Production Name</th>
                          <th>Product Count</th>
                          <th>Unit Price</th>
                          <th>Total Value</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeProductions.map(ep => (
                          <tr key={ep.id}>
                            <td>{ep.employee?.id || 'N/A'}</td>
                            <td>{ep.employee?.fullName || 'N/A'}</td>
                            <td>
                              {ep.production?.name || 'N/A'} - {ep.production?.dop}
                            </td>
                            <td>{ep.productCount?.toLocaleString()}</td>
                            <td>{ep.unitPrice?.toLocaleString()}</td>
                            <td>
                              {((ep.productCount || 0) * (ep.unitPrice || 0)).toLocaleString()}
                            </td>
                            <td>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleDelete(ep.id)}
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
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmployeeProductionInput;
