import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table, Badge, Pagination } from 'react-bootstrap';
import attendanceService from '../../services/moduleA/attendanceService';
import useDepartmentLineFilters from '../../hooks/useDepartmentLineFilters';
import LineSelector from '../../components/ModuleC/LineSelector';
import { getUsersByStructure } from '../../services/userService';

const AttendanceReportPage = () =>
{
    const {
        departments,
        departmentsLoading,
        departmentsError,
        filters: deptLineFilters,
        handleDepartmentChange,
        handleLineSelected,
        showLineSelector,
        selectedDeptForLines,
        setShowLineSelector
    } = useDepartmentLineFilters();

    const [mode, setMode] = useState('MONTH'); // DAY | MONTH | YEAR

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const currentYearStr = String(new Date().getFullYear());

    const [filterDate, setFilterDate] = useState(todayStr);
    const [filterMonth, setFilterMonth] = useState(currentMonthStr);
    const [filterYear, setFilterYear] = useState(currentYearStr);

    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [filterUserId, setFilterUserId] = useState('');

    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Sort status
    // options: 'ERROR_FIRST' | 'SUCCESS_FIRST'
    const [statusSort, setStatusSort] = useState('ERROR_FIRST');
    const STATUS_OPTIONS = ['SUCCESS', 'LATE', 'MANUAL', 'ERROR'];
    const [priorityStatus, setPriorityStatus] = useState('ERROR');
    const [priorityDirection, setPriorityDirection] = useState('FIRST'); // FIRST | LAST


    const linePath = deptLineFilters.linePath || [];
    const currentLineName = linePath[0]?.name || '-';
    const currentSubLineName = linePath.length >= 3 ? linePath[linePath.length - 2]?.name : '-';
    const currentWorkUnitName = linePath.length > 0 ? linePath[linePath.length - 1]?.name : '-';
    const selectedNode = linePath.length > 0 ? linePath[linePath.length - 1] : null;

    const structureParams = useMemo(() =>
    {
        const departmentId = deptLineFilters.departmentId || null;
        if (!departmentId) return {};

        const params = { departmentId };

        if (!selectedNode || !selectedNode.id) return params;

        const level = Number(selectedNode.level);
        if (level === 5) params.workUnitId = selectedNode.id;
        else if (level === 4) params.subLineId = selectedNode.id;
        else params.lineId = selectedNode.id;

        return params;
    }, [deptLineFilters.departmentId, selectedNode]);

    useEffect(() =>
    {
        const loadUsers = async () =>
        {
            if (!deptLineFilters.departmentId)
            {
                setUsers([]);
                return;
            }

            try
            {
                setUsersLoading(true);
                const req = {
                    departmentId: deptLineFilters.departmentId,
                    ...(structureParams.lineId ? { lineId: structureParams.lineId } : {}),
                    ...(structureParams.subLineId ? { subLineId: structureParams.subLineId } : {}),
                    ...(structureParams.workUnitId ? { wordUnitId: structureParams.workUnitId } : {})
                };
                const data = await getUsersByStructure(req);
                setUsers(Array.isArray(data) ? data : []);
            } catch (e)
            {
                setUsers([]);
            } finally
            {
                setUsersLoading(false);
            }
        };

        loadUsers();
        setFilterUserId('');
        setPage(1);
    }, [deptLineFilters.departmentId, structureParams.lineId, structureParams.subLineId, structureParams.workUnitId]);

    const calculateWorkingHours = (timeIn, timeOut) =>
    {
        if (!timeIn || !timeOut) return '-';
        const [hIn, mIn] = String(timeIn).split(':').map(Number);
        const [hOut, mOut] = String(timeOut).split(':').map(Number);
        const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
        if (diff < 0) return '-';
        return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    };

    const getStatusVariant = (status) =>
    {
        switch ((status || '').toUpperCase())
        {
            case 'SUCCESS': return 'success';
            case 'LATE': return 'warning';
            case 'MANUAL': return 'info';
            case 'ERROR': return 'danger';
            default: return 'secondary';
        }
    };

    const title = useMemo(() =>
    {
        if (mode === 'DAY') return `Attendance theo ngày: ${filterDate}`;
        if (mode === 'YEAR') return `Attendance theo năm: ${filterYear}`;
        return `Attendance theo tháng: ${filterMonth}`;
    }, [mode, filterDate, filterMonth, filterYear]);

    const loadAttendance = async () =>
    {
        if (!deptLineFilters.departmentId)
        {
            setError('Vui lòng chọn Department');
            return;
        }

        try
        {
            setLoading(true);
            setError('');
            setInfo('');
            setAttendances([]);
            setPage(1);

            const userId = filterUserId ? parseInt(filterUserId, 10) : null;

            let data = [];
            if (mode === 'DAY')
            {
                data = await attendanceService.getByDate(filterDate, userId, structureParams);
            }
            else if (mode === 'YEAR')
            {
                const startDate = `${filterYear}-01-01`;
                const endDate = `${filterYear}-12-31`;
                data = await attendanceService.getByRange(startDate, endDate, userId, structureParams);
            }
            else
            {
                const monthFormatted = filterMonth.length === 7 ? filterMonth : filterMonth.slice(0, 7);
                data = await attendanceService.getByMonth(monthFormatted, userId, structureParams);
            }

            setAttendances(Array.isArray(data) ? data : []);
            if (!data || data.length === 0) setInfo('Không có bản ghi attendance phù hợp.');
        } catch (err)
        {
            const msg = err?.response?.data?.message || err?.message || 'Failed to load attendance';
            setError(msg);
            setAttendances([]);
        } finally
        {
            setLoading(false);
        }
    };

    const handleSearch = (e) =>
    {
        e.preventDefault();
        loadAttendance();
    };

    const statusRank = useMemo(() =>
    {
        const upper = (s) => (s || '').toUpperCase();
        const mapErrorFirst = { ERROR: 1, MANUAL: 2, LATE: 3, SUCCESS: 4 };
        const mapSuccessFirst = { SUCCESS: 1, LATE: 2, MANUAL: 3, ERROR: 4 };
        const mapping = statusSort === 'SUCCESS_FIRST' ? mapSuccessFirst : mapErrorFirst;

        return (s) => mapping[upper(s)] ?? 999;
    }, [statusSort]);

    const sortedAttendances = useMemo(() =>
    {
        const list = Array.isArray(attendances) ? [...attendances] : [];
        const prio = (priorityStatus || '').toUpperCase();

        list.sort((a, b) =>
        {
            const sa = (a?.status || '').toUpperCase();
            const sb = (b?.status || '').toUpperCase();

            const aIs = sa === prio;
            const bIs = sb === prio;

            if (aIs !== bIs)
            {
                // FIRST: ưu tiên lên đầu; LAST: ưu tiên xuống cuối
                if (priorityDirection === 'LAST') return aIs ? 1 : -1;
                return aIs ? -1 : 1;
            }

            // tie-breaker: date desc
            const da = a?.date ? Date.parse(a.date) : 0;
            const db = b?.date ? Date.parse(b.date) : 0;
            return db - da;
        });

        return list;
    }, [attendances, priorityStatus, priorityDirection]);


    const totalPages = useMemo(() =>
    {
        if (pageSize <= 0) return 1;
        return Math.max(1, Math.ceil(sortedAttendances.length / pageSize));
    }, [sortedAttendances.length, pageSize]);

    const paginatedAttendances = useMemo(() =>
    {
        if (pageSize <= 0) return sortedAttendances;
        const start = (page - 1) * pageSize;
        return sortedAttendances.slice(start, start + pageSize);
    }, [sortedAttendances, page, pageSize]);

    useEffect(() =>
    {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <div className="p-4">
            <h2 className="mb-3">Attendance Report</h2>

            {(departmentsError || error || info) && (
                <div className="mb-3">
                    {departmentsError && <Alert variant="danger">{departmentsError}</Alert>}
                    {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                    {info && <Alert variant="info" onClose={() => setInfo('')} dismissible>{info}</Alert>}
                </div>
            )}

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Form onSubmit={handleSearch}>
                        <Row className="gy-3 align-items-end">
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Chế độ</Form.Label>
                                    <Form.Select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }}>
                                        <option value="DAY">Theo ngày</option>
                                        <option value="MONTH">Theo tháng</option>
                                        <option value="YEAR">Theo năm</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Thời gian</Form.Label>
                                    {mode === 'DAY' && (
                                        <Form.Control type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                                    )}
                                    {mode === 'MONTH' && (
                                        <Form.Control type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
                                    )}
                                    {mode === 'YEAR' && (
                                        <Form.Control type="number" min="2000" max="2100" value={filterYear} onChange={(e) => setFilterYear(e.target.value)} />
                                    )}
                                </Form.Group>
                            </Col>

                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label>Department</Form.Label>
                                    <Form.Select
                                        value={deptLineFilters.departmentId || ''}
                                        onChange={(e) =>
                                        {
                                            handleDepartmentChange(e);
                                            setAttendances([]);
                                            setFilterUserId('');
                                            setPage(1);
                                        }}
                                        disabled={departmentsLoading}
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Employee</Form.Label>
                                    {usersLoading ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <Form.Select
                                            value={filterUserId}
                                            onChange={(e) => { setFilterUserId(e.target.value); setPage(1); }}
                                            disabled={!deptLineFilters.departmentId}
                                        >
                                            <option value="">All Employees</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.fullName}</option>
                                            ))}
                                        </Form.Select>
                                    )}
                                </Form.Group>
                            </Col>

                            {/*<Col md={2}>*/}
                            {/*    <Form.Group>*/}
                            {/*        <Form.Label>Sort Status</Form.Label>*/}
                            {/*        <Form.Select value={statusSort} onChange={(e) => { setStatusSort(e.target.value); setPage(1); }}>*/}
                            {/*            <option value="ERROR_FIRST">ERROR → MANUAL → LATE → SUCCESS</option>*/}
                            {/*            <option value="SUCCESS_FIRST">SUCCESS → LATE → MANUAL → ERROR</option>*/}
                            {/*        </Form.Select>*/}
                            {/*    </Form.Group>*/}
                            {/*</Col>*/}
                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Ưu tiên Status</Form.Label>
                                    <Form.Select
                                        value={priorityStatus}
                                        onChange={(e) =>
                                        {
                                            setPriorityStatus(e.target.value);
                                            setPage(1);
                                        }}
                                    >
                                        {STATUS_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={2}>
                                <Form.Group>
                                    <Form.Label>Thứ tự</Form.Label>
                                    <Form.Select
                                        value={priorityDirection}
                                        onChange={(e) =>
                                        {
                                            setPriorityDirection(e.target.value);
                                            setPage(1);
                                        }}
                                    >
                                        <option value="FIRST">Ưu tiên lên trước</option>
                                        <option value="LAST">Ưu tiên xuống sau</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>

                            <Col md={1}>
                                <Button type="submit" variant="primary" className="w-100">
                                    Search
                                </Button>
                            </Col>
                        </Row>

                        <Row className="gy-3 align-items-end mt-2">
                            <Col md={8}>
                                <div className="p-2 border rounded bg-light d-flex flex-wrap align-items-center gap-1">
                                    <Button variant="link" className="p-0 me-1" disabled>
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

                            <Col md={2} className="text-end text-muted small">
                                Total: {sortedAttendances.length}
                            </Col>
                        </Row>

                        {deptLineFilters.departmentId && showLineSelector && selectedDeptForLines && (
                            <div className="mt-3 border-top pt-3">
                                <LineSelector
                                    departmentId={selectedDeptForLines}
                                    onLineSelected={handleLineSelected}
                                />
                            </div>
                        )}
                    </Form>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="fw-semibold">{title}</div>
                        <div className="text-muted small">
                            Showing {(paginatedAttendances.length > 0) ? ((page - 1) * pageSize + 1) : 0}
                            {' - '}
                            {Math.min(page * pageSize, sortedAttendances.length)}
                            {' / '}
                            {sortedAttendances.length}
                        </div>
                    </div>
                </Card.Header>

                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-4"><Spinner animation="border" /></div>
                    ) : sortedAttendances.length === 0 ? (
                        <div className="alert alert-info m-3">No attendance records found.</div>
                    ) : (
                        <Table striped bordered hover responsive className="mb-0">
                            <thead className="bg-light">
                            <tr>
                                <th>Date</th>
                                <th>Department</th>
                                <th>Employee</th>
                                <th>Time In</th>
                                <th>Time Out</th>
                                <th>Working Hours</th>
                                <th>Status</th>
                            </tr>
                            </thead>
                            <tbody>
                            {paginatedAttendances.map((att, idx) => (
                                <tr key={att.id ?? `${page}-${idx}`}>
                                    <td>{att.date || '-'}</td>
                                    <td>{att.departmentName || '-'}</td>
                                    <td>{att.userName || '-'}</td>
                                    <td>{att.timeIn ? String(att.timeIn).substring(0, 5) : '-'}</td>
                                    <td>{att.timeOut ? String(att.timeOut).substring(0, 5) : '-'}</td>
                                    <td>{calculateWorkingHours(att.timeIn, att.timeOut)}</td>
                                    <td>
                                        <Badge bg={getStatusVariant(att.status)}>
                                            {att.status || 'UNKNOWN'}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {totalPages > 1 && sortedAttendances.length > 0 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        <Pagination.First disabled={page === 1} onClick={() => setPage(1)} />
                        <Pagination.Prev disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />

                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) =>
                        {
                            const startPage = Math.max(1, page - 2);
                            return startPage + i;
                        })
                            .filter((p) => p <= totalPages)
                            .map((p) => (
                                <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                                    {p}
                                </Pagination.Item>
                            ))}

                        <Pagination.Next disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
                        <Pagination.Last disabled={page === totalPages} onClick={() => setPage(totalPages)} />
                    </Pagination>
                </div>
            )}
        </div>
    );
};

export default AttendanceReportPage;