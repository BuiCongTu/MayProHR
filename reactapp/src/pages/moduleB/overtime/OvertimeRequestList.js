import React, { useState, useEffect, useMemo } from 'react';
import { getFilteredOvertimeRequest } from "../../../services/moduleB/overtimeService";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../../services/authService";
import { useWebSocket } from '../../../contexts/WebSocketContext';
import {
    Box, Typography, Button, Paper, TextField, InputAdornment, ToggleButton, ToggleButtonGroup,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
    Collapse, Chip, colors, Grid, LinearProgress, IconButton, Tooltip, Stack,
    TablePagination
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PostAddIcon from '@mui/icons-material/PostAdd';
import { visuallyHidden } from '@mui/utils';

// --- 1. MAIN TABLE CONFIGURATION ---
const mainHeadCells = [
    { id: 'id', label: 'ID', width: '10%' },
    { id: 'departmentName', label: 'Department', width: '20%' },
    { id: 'overtimeDate', label: 'Date', width: '15%' },
    { id: 'startTime', label: 'Time', width: '15%', disableSorting: true },
    { id: 'numEmployees', label: 'Workers', numeric: true, width: '15%', disableSorting: true },
    { id: 'status', label: 'Status', width: '15%', disableSorting: true },
    { id: 'actions', label: 'Actions', width: '10%', disableSorting: true }
];

// --- 2. LINE TABLE CONFIGURATION ---
const lineHeadCells = [
    { id: 'lineId', label: 'Line ID', numeric: false, width: '10%' },
    { id: 'lineName', label: 'Line Name', numeric: false, width: '30%' },
    { id: 'progress', label: 'Staffing Progress (Staffed / Required)', numeric: false, width: '50%', disableSorting: true },
    { id: 'nav', label: '', numeric: false, width: '10%' }
];

function EnhancedTableHead(props) {
    const { order, orderBy, onRequestSort, cells, themeColor } = props;
    return (
        <TableHead>
            <TableRow sx={{ "& th": { fontWeight: 'bold', backgroundColor: themeColor || colors.blue[50] } }}>
                {cells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                        width={headCell.width}
                    >
                        {headCell.disableSorting ? (
                            headCell.label
                        ) : (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={orderBy === headCell.id ? order : 'asc'}
                                onClick={(e) => onRequestSort(e, headCell.id)}
                            >
                                {headCell.label}
                                {orderBy === headCell.id ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        )}
                    </TableCell>
                ))}
            </TableRow>
        </TableHead>
    );
}

// --- 3. LINE BREAKDOWN COMPONENT ---
function LineBreakdownTable({ request, navigate }) {
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('lineName');

    const rows = useMemo(() => {
        if (!request.lineDetails) return [];

        const staffedCounts = {};
        if (request.overtimeTickets) {
            request.overtimeTickets.forEach(ticket => {
                if (ticket.employeeList) {
                    ticket.employeeList.forEach(emp => {
                        if (emp.status === 'accepted' && emp.lineId) {
                            staffedCounts[emp.lineId] = (staffedCounts[emp.lineId] || 0) + 1;
                        }
                    });
                }
            });
        }

        // FILTER: Hide Level 4 (Leader) lines from this snapshot
        return request.lineDetails
            .filter(detail => detail.lineLevel !== 4)
            .map(detail => {
                const currentStaffed = staffedCounts[detail.lineId] || 0;
                const required = detail.numEmployees;
                const percentage = Math.min((currentStaffed / required) * 100, 100);

                return {
                    ...detail,
                    staffed: currentStaffed,
                    progressValue: percentage
                };
            });
    }, [request.lineDetails, request.overtimeTickets]);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            let aVal = a[orderBy];
            let bVal = b[orderBy];
            if (orderBy === 'lineName') {
                return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return order === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [rows, order, orderBy]);

    return (
        <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="subtitle2" color="primary" gutterBottom fontWeight="bold">
                WORKFORCE STAFFING SNAPSHOT
            </Typography>

            <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: 'white' }}>
                <Table size="small">
                    <EnhancedTableHead
                        order={order}
                        orderBy={orderBy}
                        onRequestSort={handleRequestSort}
                        cells={lineHeadCells}
                        themeColor={colors.blue[100]}
                    />
                    <TableBody>
                        {sortedRows.map((row) => {
                            let progressColor = "primary";
                            if (row.progressValue === 100) progressColor = "success";
                            else if (row.progressValue === 0) progressColor = "error";
                            else if (row.progressValue > 100) progressColor = "warning";

                            return (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                                        #{row.lineId}
                                    </TableCell>

                                    <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                        {row.lineName}
                                    </TableCell>

                                    <TableCell>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="caption" fontWeight="bold">
                                                    {row.staffed} / {row.numEmployees}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {Math.round(row.progressValue)}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={row.progressValue}
                                                color={progressColor}
                                                sx={{ height: 6, borderRadius: 3 }}
                                            />
                                        </Box>
                                    </TableCell>

                                    <TableCell padding="none" align="right">
                                        <Tooltip title="Manage Line Details">
                                            <IconButton
                                                size="small"
                                                onClick={() => navigate(`/overtime-request/${request.id}?line=${row.lineId}`)}
                                            >
                                                <ArrowForwardIcon fontSize="small" color="action" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {sortedRows.length === 0 && (
                            <TableRow><TableCell colSpan={4} align="center">No worker lines specified</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// --- 4. MAIN ROW COMPONENT ---
function RequestRow({ request, isExpanded, onToggle, navigate, isLineManager }) {
    const getStatusChip = (status) => {
        let color = 'default';
        switch (status?.toLowerCase()) {
            case 'pending': color = 'warning'; break;
            case 'open': color = 'info'; break;
            case 'processed': color = 'success'; break;
            case 'rejected': color = 'error'; break;
            case 'expired': color = 'default'; break;
        }
        return <Chip label={status?.toUpperCase()} color={color} size="small" sx={{ minWidth: 80, fontWeight: 'bold' }} />;
    };

    const fmtTime = (t) => t ? t.substring(0, 5) : '';

    const displayCount = useMemo(() => {
        if (!request.lineDetails || request.lineDetails.length === 0) return request.numEmployees;

        return request.lineDetails
            .filter(d => d.lineLevel !== 4)
            .reduce((sum, d) => sum + (d.numEmployees || 0), 0);
    }, [request]);

    return (
        <React.Fragment>
            <TableRow hover selected={isExpanded} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell onClick={onToggle} sx={{ cursor: 'pointer' }}>#{request.id}</TableCell>
                <TableCell onClick={onToggle} sx={{ cursor: 'pointer' }}>{request.departmentName || 'N/A'}</TableCell>
                <TableCell onClick={onToggle} sx={{ cursor: 'pointer' }}>{request.overtimeDate}</TableCell>
                <TableCell onClick={onToggle} sx={{ cursor: 'pointer' }}>{fmtTime(request.startTime)} - {fmtTime(request.endTime)} ({request.overtimeTime}h)</TableCell>
                <TableCell align="right" onClick={onToggle} sx={{ cursor: 'pointer' }}>
                    <Typography fontWeight="bold" color="text.primary">{displayCount}</Typography>
                </TableCell>
                <TableCell onClick={onToggle} sx={{ cursor: 'pointer' }}>{getStatusChip(request.status)}</TableCell>

                <TableCell>
                    <Stack direction="row" spacing={1}>
                        <Tooltip title="View Full Details">
                            <IconButton
                                color="primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/overtime-request/${request.id}`);
                                }}
                            >
                                <VisibilityIcon />
                            </IconButton>
                        </Tooltip>

                        {isLineManager && request.status === 'open' && (
                            <Tooltip title="Create Ticket for this Request">
                                <IconButton
                                    color="secondary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/overtime-ticket/create`, { state: { preselectedRequestId: request.id } });
                                    }}
                                >
                                    <PostAddIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </TableCell>
            </TableRow>

            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ m: 2, p: 3, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                REQUEST CONTEXT
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'white', mb: 3 }}>
                                <Grid container spacing={2} alignItems="center">
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="body2" color="textSecondary">Factory Manager</Typography>
                                        <Typography variant="subtitle2">{request.factoryManagerName}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Typography variant="body2" color="textSecondary">Created At</Typography>
                                        <Typography variant="subtitle2">{new Date(request.createdAt).toLocaleString()}</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="body2" color="textSecondary">Reason</Typography>
                                        <Typography variant="body2">{request.details || "No specific reason provided."}</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                            <LineBreakdownTable request={request} navigate={navigate} />
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

// --- 5. MAIN COMPONENT ---
export default function OvertimeRequestList() {
    const [requests, setRequests] = useState([]);
    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const [expanded, setExpanded] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [departmentSearch, setDepartmentSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const navigate = useNavigate();
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('id');

    const user = getCurrentUser();
    const isFactoryManager = user?.roleName === 'Factory Manager' || user?.roleName === 'FManager';
    const isLineManager = user?.roleName === 'Manager';

    const { subscribe, connected } = useWebSocket();

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(departmentSearch);
            setPage(0); // Reset page on search
        }, 500);
        return () => clearTimeout(t);
    }, [departmentSearch]);

    async function loadData() {
        try {
            const filter = {
                status: statusFilter || null,
                departmentName: debouncedSearch || null
            };

            if (isLineManager && user?.departmentId) {
                filter.departmentId = user.departmentId;
            }

            // USE DYNAMIC PAGE SIZE
            const data = await getFilteredOvertimeRequest(filter, {
                page,
                size: rowsPerPage, // Changed from 10
                sort: `${orderBy},${order}`
            });

            setRequests(data?.content || []);
            setTotalCount(data?.totalElements || 0); // Capture Total

        } catch (e) {
            console.error(e);
        }
    }

    useEffect(() => {
        loadData();
    }, [statusFilter, debouncedSearch, order, orderBy, page, rowsPerPage, isLineManager, user?.departmentId]);

    // WebSocket: Re-fetch on update to respect pagination limits
    useEffect(() => {
        if (!connected) return;
        const sub = subscribe('/topic/requests', (updatedRequest) => {
            loadData(); // <--- SMART REFRESH
        });
        return () => { if (sub) sub.unsubscribe(); };
    }, [connected, subscribe, page, rowsPerPage, order, orderBy]);

    const handleMainSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // --- PAGINATION HANDLERS ---
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    return (
        <Box>
            <Paper elevation={0} sx={{
                p: 2, mb: 2, bgcolor: 'white', border: '1px solid #eee',
                display: 'flex', gap: 2, alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto'
            }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 2, whiteSpace: 'nowrap' }}>Overtime Overview</Typography>

                {!isLineManager && (
                    <TextField
                        size="small"
                        placeholder="Search Department..."
                        value={departmentSearch}
                        onChange={e => setDepartmentSearch(e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                        sx={{ minWidth: 200 }}
                    />
                )}

                <ToggleButtonGroup
                    value={statusFilter}
                    exclusive
                    onChange={(e, v) => {
                        if (v !== null) {
                            setStatusFilter(v);
                            setPage(0); // Reset page on filter
                        }
                    }}
                    size="small"
                    sx={{ whiteSpace: 'nowrap' }}
                >
                    <ToggleButton value="">All</ToggleButton>
                    {!isLineManager && <ToggleButton value="pending" color="warning">Pending</ToggleButton>}
                    <ToggleButton value="open" color="info">Open</ToggleButton>
                    <ToggleButton value="processed" color="success">Processed</ToggleButton>
                </ToggleButtonGroup>

                <Box flexGrow={1} />

                <Stack direction="row" spacing={2} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                    {isFactoryManager && (
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/overtime-request/create")}>
                            New Request
                        </Button>
                    )}
                </Stack>
            </Paper>

            <Paper elevation={0} sx={{ border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                <TableContainer>
                    <Table sx={{ tableLayout: 'fixed', minWidth: 800 }}>
                        <EnhancedTableHead
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleMainSort}
                            cells={mainHeadCells}
                            themeColor={colors.blue[50]}
                        />
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow><TableCell colSpan={7} align="center">No requests found.</TableCell></TableRow>
                            ) : requests.map(req => (
                                <RequestRow
                                    key={req.id}
                                    request={req}
                                    isExpanded={expanded === req.id}
                                    onToggle={() => setExpanded(expanded === req.id ? false : req.id)}
                                    navigate={navigate}
                                    isLineManager={isLineManager}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* --- PAGINATION CONTROL --- */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalCount} // from backend
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    showFirstButton
                    showLastButton
                    sx={{
                        borderTop: '1px solid #e0e0e0',
                        bgcolor: '#fafafa',
                        '.MuiTablePagination-toolbar': {
                            minHeight: 52,
                            px: 2
                        },
                        '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                            margin: 0,
                            fontWeight: 500,
                            color: 'text.secondary'
                        },
                        '.MuiTablePagination-actions': {
                            ml: 2
                        }
                    }}
                />
            </Paper>
        </Box>
    );
}