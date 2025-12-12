import { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Pagination, Row, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import LineSelector from '../../components/ModuleC/LineSelector';
import useDepartmentLineFilters from '../../hooks/useDepartmentLineFilters';
import { getUsersByDepartment } from '../../services/userService';
import '../../styles/payroll.css';

const UserList = () =>
{
  const {
    departments,
    departmentsLoading,
    departmentsError,
    filters: deptLineFilters,              // { departmentId, departmentName, lineId, lineName }
    handleDepartmentChange,
    handleLineSelected,
    clearDepartmentLineFilters,
    showLineSelector,
    selectedDeptForLines,
    setShowLineSelector
  } = useDepartmentLineFilters();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Load users khi chọn Department (theo id)
  useEffect(() =>
  {
    let isMounted = true;

    const loadUsers = async () =>
    {
      if (!deptLineFilters.departmentId)
      {
        setUsers([]);
        return;
      }

      try
      {
        setLoadingUsers(true);
        setUserError('');
        const data = await getUsersByDepartment(deptLineFilters.departmentId);
        if (isMounted)
        {
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err)
      {
        if (isMounted)
        {
          const message = err?.response?.data?.message || err.message || 'Failed to load users';
          setUserError(message);
          setUsers([]);
        }
      } finally
      {
        if (isMounted)
        {
          setLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => { isMounted = false; };
  }, [deptLineFilters.departmentId]);

  // Lọc theo Dept + line đã chọn từ LineSelector + search
  const filteredUsers = useMemo(() =>
  {
    let list = users;

    if (deptLineFilters.departmentId)
    {
      list = list.filter(
        (u) => String(u.departmentId) === String(deptLineFilters.departmentId)
      );
    }

    if (deptLineFilters.lineId)
    {
      const selectedLineId = String(deptLineFilters.lineId);
      list = list.filter((u) =>
        String(u.lineId) === selectedLineId ||
        String(u.subLineId) === selectedLineId ||
        String(u.workUnitId) === selectedLineId
      );
    }

    if (search)
    {
      const keyword = search.toLowerCase();
      list = list.filter((u) =>
      {
        const name = u.fullName?.toLowerCase() || '';
        const phone = u.phone?.toLowerCase() || '';
        const dept = (u.departmentName || u.department?.name || '').toLowerCase();
        const line = (u.lineName || u.line?.name || '').toLowerCase();
        return (
          name.includes(keyword) ||
          phone.includes(keyword) ||
          dept.includes(keyword) ||
          line.includes(keyword)
        );
      });
    }
    return list;
  }, [
    users,
    search,
    deptLineFilters.departmentId,
    deptLineFilters.lineId
  ]);

  const totalPages = useMemo(() =>
  {
    if (pageSize <= 0) return 1;
    const count = filteredUsers.length;
    return Math.max(1, Math.ceil(count / pageSize));
  }, [filteredUsers.length, pageSize]);

  const paginatedUsers = useMemo(() =>
  {
    if (pageSize <= 0) return filteredUsers;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, page, pageSize]);

  useEffect(() =>
  {
    if (page > totalPages)
    {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Khi chọn Department trong select
  const handleDeptChange = (e) =>
  {
    handleDepartmentChange(e);
    setPage(1);
  };

  const getLineChain = (user) =>
  {
    const chain = [];
    let node = user?.line || null;

    // Xây dựng chain từ root -> leaf dựa vào quan hệ parent - children
    while (node)
    {
      chain.unshift(node);
      node = node.parent || null;
    }

    return chain;
  };

  const getDepartmentName = (user) =>
  {
    return user.departmentName || user.department?.name || '-';
  };

  const getWorkUnitName = (user) =>
  {
    if (user.workUnitName) return user.workUnitName;

    const chain = getLineChain(user); // [root, ..., leaf]

    // Work Unit là node sâu nhất trong hierarchy (leaf)
    if (chain.length > 0)
    {
      return chain[chain.length - 1]?.name || getDepartmentName(user);
    }

    // Fallback nếu không có line
    return user.workUnit?.name || getDepartmentName(user);
  };

  const getSubLineName = (user) =>
  {
    if (user.subLineName) return user.subLineName;

    const chain = getLineChain(user); // [root, ..., leaf]

    // Nếu có ít nhất 3 level thì Sub Line là node trước Work Unit (second last)
    if (chain.length >= 3)
    {
      return chain[chain.length - 2]?.name || '-';
    }

    // Nếu chỉ có 1-2 level thì coi như không có Sub Line rõ ràng
    return '-';
  };

  const getLineName = (user) =>
  {
    if (user.lineName) return user.lineName;

    const chain = getLineChain(user); // [root, ..., leaf]
    return chain[0]?.name || user.line?.name || '-';
  };

  const getStatusBadge = (status) =>
  {
    const value = (status || '').toLowerCase();
    switch (value)
    {
      case 'active':
        return 'success';
      case 'inactive':
      case 'terminated':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const getStatusLabel = (status) =>
  {
    return status || 'Active';
  };

  const clearLineFilterOnly = () =>
  {
    // chỉ clear line trong filters, giữ nguyên department
    handleLineSelected(null);
  };

  // Breadcrumb hiển thị vị trí hiện tại: Department / Line / SubLine / WorkUnit
  const linePath = deptLineFilters.linePath || [];

  const currentLineName = linePath[0]?.name || '-';
  const currentSubLineName = linePath.length >= 3 ? linePath[linePath.length - 2]?.name : '-';
  const currentWorkUnitName = linePath.length > 0 ? linePath[linePath.length - 1]?.name : '-';

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>User List</h2>
      </div>

      {(departmentsError || userError) && (
        <Alert variant="danger">
          {departmentsError || userError}
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="gy-3 align-items-end">
            <Col md={8}>
              <div className="mb-2 fw-semibold">
                Department / Line / Sub Line / Work Unit
              </div>
              <div className="p-2 border rounded bg-light d-flex flex-wrap align-items-center gap-1">
                <Button
                  variant="link"
                  className="p-0 me-1"
                  onClick={() =>
                  {
                    // focus vào select department (nếu muốn có thể scroll tới)
                  }}
                >
                  {deptLineFilters.departmentName || 'Select Department'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0 me-1"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {currentLineName !== '-' ? currentLineName : 'Line'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0 me-1"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {currentSubLineName !== '-' ? currentSubLineName : 'Sub Line'}
                </Button>
                <span className="mx-1">/</span>
                <Button
                  variant="link"
                  className="p-0 me-1"
                  disabled={!deptLineFilters.departmentId}
                  onClick={() => setShowLineSelector(true)}
                >
                  {currentWorkUnitName !== '-' ? currentWorkUnitName : 'Work Unit'}
                </Button>
              </div>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  value={search}
                  onChange={(e) =>
                  {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="name / phone / dept / line"
                />
              </Form.Group>
            </Col>

            <Col md={2}>
              <Form.Group>
                <Form.Label>Page size</Form.Label>
                <Form.Select
                  value={pageSize}
                  onChange={(e) =>
                  {
                    setPageSize(parseInt(e.target.value, 10) || 10);
                    setPage(1);
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Selector ẩn, chỉ hiện khi cần xem cây Line */}
          {deptLineFilters.departmentId && showLineSelector && selectedDeptForLines && (
            <div className="mt-3 border-top pt-3">
              <LineSelector
                departmentId={selectedDeptForLines}
                onLineSelected={handleLineSelected}
              />
              {deptLineFilters.lineId && (
                <div className="mt-2 d-flex justify-content-between align-items-center">
                  <div className="small text-muted">
                    Selected: {deptLineFilters.lineName}
                  </div>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={clearLineFilterOnly}
                  >
                    Clear line
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Table */}
      <Card className="shadow-sm">
        <Card.Body className="p-0">
          {!deptLineFilters.departmentId ? (
            <div className="alert alert-warning m-3">
              ⚠️ Please select a department to see users.
            </div>
          ) : loadingUsers ? (
            <div className="text-center p-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading users...</span>
              </Spinner>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="alert alert-info m-3">
              No users found for the selected filters.
            </div>
          ) : (
            <Table striped hover responsive className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Line</th>
                  <th>Sub Line</th>
                  <th>Work Unit</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <small className="text-muted">#{user.id}</small>
                    </td>
                    <td>{user.fullName || '-'}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{getDepartmentName(user)}</td>
                    <td>{getLineName(user)}</td>
                    <td>{getSubLineName(user)}</td>
                    <td>{getWorkUnitName(user)}</td>
                    <td>
                      <Badge bg={getStatusBadge(user.status || user.userStatus)}>
                        {getStatusLabel(user.status || user.userStatus)}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button
                          as={Link}
                          to={`/users/${user.id}`}
                          size="sm"
                          variant="info"
                        >
                          View
                        </Button>
                        <Button
                          as={Link}
                          to={`/payroll/create?userId=${user.id}`}
                          size="sm"
                          variant="success"
                        >
                          Create Payment
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && paginatedUsers.length > 0 && (
        <div className="d-flex justify-content-center mt-4">
          <Pagination>
            <Pagination.First
              disabled={page === 1}
              onClick={() => setPage(1)}
            />
            <Pagination.Prev
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            />
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
            {
              const startPage = Math.max(1, page - 2);
              return startPage + i;
            })
              .filter((p) => p <= totalPages)
              .map((p) => (
                <Pagination.Item
                  key={p}
                  active={p === page}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Pagination.Item>
              ))}
            <Pagination.Next
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
            <Pagination.Last
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            />
          </Pagination>
        </div>
      )}
    </div>
  );
};

export default UserList;