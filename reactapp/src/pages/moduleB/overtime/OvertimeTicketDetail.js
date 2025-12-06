import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    getOvertimeTicketById,
    getOvertimeRequestById
} from '../../../services/moduleB/overtimeService';
import TicketStatusTracker from '../../../components/moduleB/TicketStatusTracker';
import EmployeeListTable from './EmployeeList';
import {useWebSocket} from '../../../contexts/WebSocketContext';

import {
    Box, CircularProgress, Typography, Alert, Button, Container,
    Paper, Grid, Chip, Stack, Divider, Tabs, Tab, Drawer, IconButton,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TableSortLabel, LinearProgress, Collapse
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import ViewListIcon from '@mui/icons-material/ViewList';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {visuallyHidden} from '@mui/utils';

// --- TABLE HEADERS ---
const headCells = [
    {id: 'name', label: 'Line Name', width: '25%'},
    {id: 'required', label: 'Required', numeric: true, width: '10%'},
    {id: 'assigned', label: 'Assigned', numeric: true, width: '10%'},
    {id: 'accepted', label: 'Accepted', numeric: true, width: '10%', disableSorting: true},
    {id: 'progress', label: 'Fulfillment Progress', width: '25%', disableSorting: true},
    {id: 'expand', label: '', width: '5%', disableSorting: true},
];

function EnhancedTableHead(props) {
    const {order, orderBy, onRequestSort} = props;
    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };

    return (
        <TableHead>
            <TableRow sx={{bgcolor: 'grey.100'}}>
                {headCells.map((headCell) => (
                    <TableCell
                        key={headCell.id}
                        align={headCell.numeric ? 'right' : 'left'}
                        sortDirection={orderBy === headCell.id ? order : false}
                        width={headCell.width}
                        sx={{fontWeight: 'bold'}}
                    >
                        {headCell.disableSorting ? (
                            headCell.label
                        ) : (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={orderBy === headCell.id ? order : 'asc'}
                                onClick={createSortHandler(headCell.id)}
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

// --- ROW COMPONENT ---
function LineRow({row, isExpanded, onToggle}) {
    const {name, required, assigned, acceptedCount, employees} = row;
    const progressVal = assigned > 0 ? Math.min((acceptedCount / assigned) * 100, 100) : 0;
    const isFullyAccepted = assigned > 0 && acceptedCount >= assigned;
    const color = isFullyAccepted ? 'success' : (progressVal > 50 ? 'primary' : 'warning');

    return (
        <React.Fragment>
            <TableRow hover onClick={onToggle} sx={{cursor: 'pointer', '& > *': {borderBottom: 'unset'}}}
                      selected={isExpanded}>
                <TableCell component="th" scope="row" sx={{fontWeight: 500}}>{name}</TableCell>
                <TableCell align="right">{required}</TableCell>
                <TableCell align="right">{assigned}</TableCell>
                <TableCell align="right">
                    <Chip label={`${acceptedCount} / ${assigned}`} size="small"
                          color={isFullyAccepted ? "success" : "default"}
                          variant={isFullyAccepted ? "filled" : "outlined"} sx={{fontWeight: 'bold', minWidth: 60}}/>
                </TableCell>
                <TableCell>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Box sx={{width: '100%', mr: 1}}>
                            <LinearProgress variant="determinate" value={progressVal} color={color}
                                            sx={{height: 8, borderRadius: 5}}/>
                        </Box>
                        <Box sx={{minWidth: 35}}>
                            <Typography variant="body2" color="text.secondary">{Math.round(progressVal)}%</Typography>
                        </Box>
                    </Box>
                </TableCell>
                <TableCell>
                    <IconButton size="small">{isExpanded ? <KeyboardArrowUpIcon/> :
                        <KeyboardArrowDownIcon/>}</IconButton>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{paddingBottom: 0, paddingTop: 0}} colSpan={6}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{margin: 2}}>
                            <Typography variant="subtitle2" gutterBottom component="div" color="primary">Employee List
                                — {name}</Typography>
                            <Paper variant="outlined"><EmployeeListTable employees={employees}/></Paper>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export default function OvertimeTicketDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const {subscribe, connected} = useWebSocket();
    const [ticket, setTicket] = useState(null);
    const [lineRequirements, setLineRequirements] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');
    const [expandedLineId, setExpandedLineId] = useState(null);

    const loadData = async () => {
        try {
            const ticketData = await getOvertimeTicketById(id);
            setTicket(ticketData);
            if (ticketData.requestId) {
                const requestData = await getOvertimeRequestById(ticketData.requestId);
                const reqMap = {};
                if (requestData.lineDetails) {
                    requestData.lineDetails.forEach(detail => {
                        reqMap[detail.lineId] = detail.numEmployees;
                    });
                }
                setLineRequirements(reqMap);
            }
        } catch (err) {
            setError("Failed to load data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (!connected) return;
        const sub = subscribe('/topic/tickets', (dto) => {
            if (dto.id === parseInt(id)) {
                loadData();
            }
        });
        return () => {
            if (sub) sub.unsubscribe();
        };
    }, [connected, subscribe, id]);

    const rows = useMemo(() => {
        if (!ticket || !ticket.employeeList) return [];
        const groups = {};
        ticket.employeeList.forEach(emp => {
            const lineId = emp.lineId || 9999;
            const lineName = emp.lineName || "Unassigned Line";
            if (!groups[lineId]) {
                groups[lineId] = {
                    id: lineId,
                    name: lineName,
                    employees: [],
                    required: lineRequirements[lineId] || 0,
                    acceptedCount: 0
                };
            }
            groups[lineId].employees.push(emp);
            if (emp.status === 'accepted') {
                groups[lineId].acceptedCount++;
            }
        });
        return Object.values(groups).map(g => ({...g, assigned: g.employees.length}));
    }, [ticket, lineRequirements]);

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortedRows = useMemo(() => {
        return [...rows].sort((a, b) => {
            const isAsc = order === 'asc';
            if (orderBy === 'name') return isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
            return isAsc ? (a[orderBy] - b[orderBy]) : (b[orderBy] - a[orderBy]);
        });
    }, [rows, order, orderBy]);

    const getStatusChip = (status) => {
        let color = 'default';
        let label = status?.toUpperCase() || 'UNKNOWN';
        switch (status?.toLowerCase()) {
            case 'submitted':
                color = 'info';
                break;
            case 'approved':
                color = 'success';
                break;
            case 'rejected':
                color = 'error';
                break;
        }
        return <Chip label={label} color={color} sx={{fontWeight: 'bold', borderRadius: 1}}/>;
    };

    const fmtTime = (t) => t ? t.substring(0, 5) : '';

    if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress/></Box>;
    if (error) return <Box p={5}><Alert severity="error">{error}</Alert></Box>;
    if (!ticket) return null;

    return (
        <Container maxWidth="lg" sx={{mt: 2, mb: 8}}>
            <Paper elevation={2} sx={{p: 3, mb: 3, borderRadius: 2, borderTop: '4px solid #1976d2'}}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Button startIcon={<ArrowBackIcon/>} onClick={() => navigate('/overtime-ticket')}
                            sx={{color: 'text.secondary'}}>Back to Tickets</Button>
                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" startIcon={<HistoryIcon/>}
                                onClick={() => setDrawerOpen(true)}>History</Button>
                    </Stack>
                </Stack>
                <Divider sx={{mb: 2}}/>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">Ticket
                                #{ticket.id}</Typography>
                            {getStatusChip(ticket.status)}
                        </Stack>
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>Request
                            Ref: <strong>#{ticket.requestId}</strong> • {ticket.departmentName}</Typography>
                        <Stack direction="row" spacing={1} mt={2}>
                            <Chip icon={<CalendarTodayIcon fontSize='small'/>} label={ticket.overtimeDate}
                                  variant="outlined" size="small"/>
                            <Chip icon={<AccessTimeIcon fontSize='small'/>}
                                  label={`${fmtTime(ticket.startTime)} - ${fmtTime(ticket.endTime)}`} variant="outlined"
                                  size="small"/>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            <Box sx={{width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2}}>
                <Box sx={{borderBottom: 1, borderColor: 'divider', mb: 2}}>
                    <Tabs value={0}><Tab icon={<ViewListIcon/>} iconPosition="start" label="Line Breakdown & Staffing"/></Tabs>
                </Box>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort}/>
                        <TableBody>
                            {sortedRows.length > 0 ? (
                                sortedRows.map((row) => (
                                    <LineRow key={row.id} row={row} isExpanded={expandedLineId === row.id}
                                             onToggle={() => setExpandedLineId(expandedLineId === row.id ? null : row.id)}/>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} align="center" sx={{py: 3}}>No lines found or no
                                    employees assigned.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                <Box sx={{width: 350, p: 3}}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">Status Tracker</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon/></IconButton>
                    </Box>
                    <Divider sx={{mb: 3}}/>
                    <TicketStatusTracker status={ticket.status} orientation="vertical"/>
                    <Box mt={4} p={2} bgcolor="grey.50" borderRadius={2}>
                        <Typography variant="caption" color="textSecondary" display="block"
                                    gutterBottom>METADATA</Typography>
                        <Typography variant="body2"><strong>Last Updated:</strong> {new Date().toLocaleDateString()}
                        </Typography>
                    </Box>
                </Box>
            </Drawer>
        </Container>
    );
}