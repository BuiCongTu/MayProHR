import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    approveOvertimeRequest,
    getOvertimeRequestById
} from '../../../services/moduleB/overtimeService';
import { getLinesByDepartment } from '../../../services/departmentService';
import {getCurrentUser} from '../../../services/authService';
import RequestStatusTracker from '../../../components/moduleB/RequestStatusTracker';
import EmployeeListTable from './EmployeeList';
import RequestTicketList from './RequestTicketList';
import {useWebSocket} from '../../../contexts/WebSocketContext';

import {
    Box, CircularProgress, Typography, Alert, Button, Container,
    Paper, Grid, Chip, LinearProgress, Card, CardContent, Stack,
    Accordion, AccordionSummary, AccordionDetails, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, Tabs, Tab, CardActionArea,
    Drawer, Divider, Avatar
} from '@mui/material';

// Icons
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import ViewListIcon from '@mui/icons-material/ViewList';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import HistoryIcon from '@mui/icons-material/History';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PostAddIcon from '@mui/icons-material/PostAdd';
import AutoModeIcon from "@mui/icons-material/AutoMode";
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';

// Helper to safely get name
const getEmpName = (emp) => emp.employeeName || emp.fullName || emp.name || "Unknown";

function processStaffingData(request, allLines = []) {
    if (!request || !request.lineDetails) return {stats: {}, sections: []};

    const lineMap = {};
    let pendingTicketsGlobal = 0;

    // 1. Initialize Map with Hierarchy Info
    request.lineDetails.forEach(detail => {
        // Safe string comparison for ID
        const lineDef = allLines.find(l => String(l.id) === String(detail.lineId));

        lineMap[detail.lineId] = {
            id: detail.lineId,
            name: detail.lineName,
            level: lineDef ? lineDef.level : 5, // Default to 5 if not found
            parentId: lineDef ? lineDef.parentId : null,
            required: detail.numEmployees,
            staffed: 0,
            tickets: []
        };
    });

    // 2. Process Tickets & Contributions
    if (request.overtimeTickets) {
        request.overtimeTickets.forEach(ticket => {
            if (ticket.status === 'rejected' || ticket.status === 'pending') return;
            if (ticket.status === 'submitted') pendingTicketsGlobal++;

            if (ticket.employeeList) {
                const employeesByLine = {};
                ticket.employeeList.forEach(emp => {
                    if (emp.status === 'accepted' && emp.lineId) {
                        if (!employeesByLine[emp.lineId]) employeesByLine[emp.lineId] = [];
                        employeesByLine[emp.lineId].push(emp);
                    }
                });

                Object.keys(employeesByLine).forEach(lineId => {
                    const lineEntry = lineMap[lineId];
                    const contributingEmps = employeesByLine[lineId];

                    if (lineEntry) {
                        lineEntry.staffed += contributingEmps.length;
                        lineEntry.tickets.push({
                            ticketId: ticket.id,
                            managerName: ticket.managerName || ticket.manager?.fullName || "Unknown",
                            status: ticket.status,
                            reason: ticket.reason,
                            contribution: contributingEmps.length,
                            employees: contributingEmps
                        });
                    }
                });
            }
        });
    }

    // 3. Grouping Logic
    const sections = [];
    const processedIds = new Set();
    const lineArray = Object.values(lineMap);

    // A. Find Level 4 Leaders (Sections)
    lineArray.filter(l => l.level === 4).forEach(leaderLine => {
        let leaderName = "Pending Assignment";

        // Find the auto-generated ticket for this leader line
        const autoTicket = leaderLine.tickets.find(t => t.contribution > 0);
        if (autoTicket && autoTicket.employees.length > 0) {
            leaderName = getEmpName(autoTicket.employees[0]);
        }

        sections.push({
            type: 'section',
            header: {
                ...leaderLine,
                leaderName: leaderName
            },
            children: []
        });
        processedIds.add(leaderLine.id);
    });

    // B. Assign Level 5 Workers to Parents
    lineArray.filter(l => l.level === 5).forEach(workerLine => {
        const parentSection = sections.find(s => String(s.header.id) === String(workerLine.parentId));
        if (parentSection) {
            parentSection.children.push(workerLine);
            processedIds.add(workerLine.id);
        }
    });

    // C. Handle Orphans
    const orphans = lineArray.filter(l => !processedIds.has(l.id));
    if (orphans.length > 0) {
        sections.push({
            type: 'misc',
            header: { name: 'Other Lines' },
            children: orphans
        });
    }

    // 4. Global Stats (Exclude Level 4 from Count)
    const workerLines = lineArray.filter(l => l.level !== 4);
    const totalDemand = workerLines.reduce((sum, l) => sum + l.required, 0);
    const totalSupply = workerLines.reduce((sum, l) => sum + l.staffed, 0);

    return {
        stats: {
            totalDemand,
            totalSupply,
            fillRate: totalDemand > 0 ? Math.round((totalSupply / totalDemand) * 100) : 0,
            pendingTickets: pendingTicketsGlobal
        },
        sections
    };
}

function StatCard({ title, value, subtitle, icon, color, onClick }) {
    const CardContentWrapper = onClick ? CardActionArea : React.Fragment;
    const wrapperProps = onClick ? { onClick: onClick } : {};

    return (
        <Card elevation={2} sx={{ height: '100%', borderTop: `4px solid ${color}` }}>
            <CardContentWrapper {...wrapperProps}>
                <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                        <Box>
                            <Typography color="textSecondary" variant="caption" fontWeight="bold" textTransform="uppercase">
                                {title}
                            </Typography>
                            <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>
                                {value}
                            </Typography>
                            {subtitle}
                        </Box>
                        <Box sx={{ p: 1, bgcolor: `${color}15`, borderRadius: 2, color: color }}>
                            {icon}
                        </Box>
                    </Stack>
                </CardContent>
            </CardContentWrapper>
        </Card>
    );
}

function TicketStatusChip({ status }) {
    let color = 'default';
    if (status === 'submitted') color = 'info';
    if (status === 'approved') color = 'success';
    if (status === 'rejected') color = 'error';
    return <Chip label={status?.toUpperCase()} color={color} size="small" sx={{ fontWeight: 'bold', minWidth: 80 }} />;
}

export default function OvertimeRequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const { subscribe, connected } = useWebSocket();

    const [request, setRequest] = useState(null);
    const [allLines, setAllLines] = useState([]);
    const [processedData, setProcessedData] = useState({ stats: {}, sections: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [tabValue, setTabValue] = useState(0);
    const [expandedAccordion, setExpandedAccordion] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
    const [selectedEmployeeList, setSelectedEmployeeList] = useState([]);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState({ type: null, id: null });

    const loadData = async () => {
        setError(null);
        try {
            const data = await getOvertimeRequestById(id);
            let linesData = allLines;

            // Need hierarchy to properly group lines
            if (linesData.length === 0 && data.departmentId) {
                linesData = await getLinesByDepartment(data.departmentId);
                setAllLines(linesData);
            }

            setRequest(data);
            setProcessedData(processStaffingData(data, linesData));
        } catch (err) {
            setError("Failed to load request details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!user || !user.id) return;
        loadData();
    }, [id, user?.id, connected]);

    useEffect(() => {
        if (!connected) return;

        const requestSub = subscribe('/topic/requests', (dto) => {
            if (dto.id === parseInt(id)) loadData();
        });

        const ticketSub = subscribe('/topic/tickets', (dto) => {
            if (dto.requestId === parseInt(id)) {
                loadData();
            }
        });

        return () => {
            if (requestSub) requestSub.unsubscribe();
            if (ticketSub) ticketSub.unsubscribe();
        };
    }, [id, connected, subscribe]);


    const handleAccordionChange = (panelId) => (event, isExpanded) => {
        setExpandedAccordion(isExpanded ? panelId : false);
    };

    const handleApproveRequest = async () => {
        if (!window.confirm("Approve this request?")) return;
        try {
            await approveOvertimeRequest(request.id);
            loadData();
        } catch (err) {
            alert("Error approving request: " + (err.message || err));
        }
    }

    const handleRejectRequestClick = () => {
        setRejectTarget({ type: 'request', id: request.id });
        setRejectModalOpen(true);
    }

    const handleViewEmployees = (list) => {
        setSelectedEmployeeList(list || []);
        setEmployeeModalOpen(true);
    };

    const handlePendingCardClick = () => {
        setTabValue(1);
    };

    const renderActionButtons = () => {
        const isManager = user?.roleName === 'Factory Manager' || user?.roleName === 'FManager';
        const isDirector = user?.roleName === 'Factory Director' || user?.roleName === 'FDirector';
        const isLineManager = user?.roleName === 'Manager';
        const status = request.status?.toLowerCase();

        return (
            <Stack direction="row" spacing={1} alignItems="center">
                <Button
                    variant="outlined"
                    startIcon={<HistoryIcon />}
                    onClick={() => setDrawerOpen(true)}
                    sx={{ borderColor: 'grey.400', color: 'grey.700' }}
                >
                    History
                </Button>

                {status === 'open' && isLineManager && (
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<PostAddIcon />}
                        onClick={() => navigate('/overtime-ticket/create', { state: { preselectedRequestId: request.id } })}
                        sx={{ fontWeight: 'bold' }}
                    >
                        Create Ticket
                    </Button>
                )}

                {status === 'pending' && (
                    <>
                        {isManager && (
                            <Chip icon={<HourglassEmptyIcon />} label="Waiting for FD Approval" color="default" variant="outlined" />
                        )}
                        {isDirector && (
                            <>
                                <Button variant="contained" color="error" startIcon={<ThumbDownIcon />} onClick={handleRejectRequestClick}>
                                    Reject
                                </Button>
                                <Button variant="contained" color="success" startIcon={<ThumbUpIcon />} onClick={handleApproveRequest}>
                                    Approve Request
                                </Button>
                            </>
                        )}
                    </>
                )}
                {status === 'open' && isDirector && (
                    <Chip label="Approved & Open" color="success" variant="outlined" />
                )}
                {status === 'processed' && (
                    <Chip label="Processed for Payroll" color="success" />
                )}
            </Stack>
        );
    };

    const getHeaderStatusChip = (status) => {
        let color = 'default';
        let label = status?.toUpperCase() || 'UNKNOWN';

        switch (status?.toLowerCase()) {
            case 'pending': color = 'warning'; break;
            case 'open': color = 'info'; break;
            case 'processed': color = 'success'; break;
            case 'rejected': color = 'error'; break;
        }

        return <Chip label={label} color={color} variant="filled" sx={{ fontWeight: 'bold', fontSize: '0.9rem', height: 32, px: 1 }} />;
    };

    if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;
    if (error) return <Box p={5}><Alert severity="error">{error}</Alert></Box>;
    if (!request) return null;

    const { stats, sections } = processedData;
    const fmtTime = (t) => t ? t.substring(0, 5) : '';

    return (
        <Container maxWidth="xl" sx={{ mt: 2, mb: 8 }}>

            {/* HEADER */}
            <Box mb={3}>
                <Paper elevation={2} sx={{ p: 3, borderRadius: 2, borderTop: '4px solid #1976d2' }}>
                    <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between"
                           alignItems={{ xs: 'start', md: 'center' }} spacing={2} mb={2}>
                        <Button
                            startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/overtime-request')}
                            sx={{ color: 'text.secondary' }}
                        >
                            Back to List
                        </Button>
                        {renderActionButtons()}
                    </Stack>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={8}>
                            <Stack direction="row" alignItems="center" spacing={2} mb={1}>
                                <Typography variant="h4" fontWeight="bold" color="primary.main">
                                    Overtime Request #{request.id}
                                </Typography>
                                {getHeaderStatusChip(request.status)}
                            </Stack>
                            <Typography variant="overline" color="textSecondary" sx={{ letterSpacing: 1, display: 'block', mb: 2 }}>
                                {request.departmentName} • Created by {request.factoryManagerName}
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                                <Chip
                                    icon={<CalendarTodayIcon fontSize="small" />}
                                    label={<Typography variant="body2" fontWeight="bold">{request.overtimeDate}</Typography>}
                                    variant="outlined"
                                    sx={{ px: 1, borderColor: 'grey.300' }}
                                />
                                <Chip
                                    icon={<AccessTimeIcon fontSize="small" />}
                                    label={`${fmtTime(request.startTime)} - ${fmtTime(request.endTime)} (${request.overtimeTime}h)`}
                                    variant="outlined"
                                    sx={{ borderColor: 'grey.300' }}
                                />
                            </Stack>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            {request.details && (
                                <Box sx={{ bgcolor: 'grey.50', p: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                        <DescriptionIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2" fontWeight="bold" color="text.primary">Request Note:</Typography>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>"{request.details}"</Typography>
                                </Box>
                            )}
                        </Grid>
                    </Grid>
                </Paper>
            </Box>

            {/* AUTOMATION BANNER */}
            {request.status === 'open' && (
                <Alert severity="info" icon={<AutoModeIcon />} variant="filled" sx={{ mb: 3, boxShadow: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">Auto-Processing Active</Typography>
                    Leader assignment (Level 4) is automated. Use the "Line Coverage" tab to view leadership hierarchy.
                </Alert>
            )}

            {/* STAT CARDS */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="Total Demand" value={stats.totalDemand} subtitle={<Typography variant="body2" color="textSecondary">Required Employees (L5)</Typography>} icon={<GroupIcon />} color="#1976d2" />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="Current Supply" value={stats.totalSupply} subtitle={<Typography variant="body2" color="textSecondary">Accepted Employees</Typography>} icon={<AssignmentTurnedInIcon />} color={stats.totalSupply >= stats.totalDemand ? "#2e7d32" : "#ed6c02"} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="In Queue" value={stats.pendingTickets} subtitle={<Typography variant="body2" color="textSecondary">Submitted Tickets</Typography>} icon={<PendingActionsIcon />} color={stats.pendingTickets > 0 ? "#1976d2" : "#9e9e9e"} onClick={stats.pendingTickets > 0 ? handlePendingCardClick : undefined} />
                </Grid>
            </Grid>

            {/* TABS AREA */}
            <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
                        <Tab icon={<ViewListIcon />} label="Line Coverage" iconPosition="start" />
                        <Tab icon={<TableChartIcon />} label="Ticket List" iconPosition="start" />
                    </Tabs>
                </Box>

                {/* TAB 0: HIERARCHY COVERAGE */}
                {tabValue === 0 && (
                    <Box>
                        {sections.map((section, idx) => (
                            <Box key={idx} sx={{ mb: 3 }}>
                                {/* LEVEL 4 HEADER */}
                                {section.type === 'section' && (
                                    <Paper elevation={0} sx={{ bgcolor: '#e3f2fd', p: 2, border: '1px solid #bbdefb', mb: 1 }}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <SupervisorAccountIcon color="primary" />
                                                <Typography variant="h6" fontWeight="bold" color="primary.dark">
                                                    {section.header.name}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                avatar={<Avatar sx={{ bgcolor: 'primary.dark' }}>L</Avatar>}
                                                label={`Leader: ${section.header.leaderName}`}
                                                color="primary"
                                                variant="outlined"
                                                sx={{ bgcolor: 'white' }}
                                                icon={<BadgeIcon />}
                                            />
                                        </Stack>
                                    </Paper>
                                )}

                                {/* LEVEL 5 CHILDREN */}
                                {section.children.map((line) => {
                                    const isFull = line.staffed >= line.required;
                                    const statusColor = isFull ? 'success.main' : (line.staffed === 0 ? 'error.main' : 'warning.main');

                                    return (
                                        <Accordion
                                            key={line.id}
                                            sx={{ mb: 1, border: '1px solid #eee', '&:before': { display: 'none' }, ml: section.type === 'section' ? 2 : 0 }}
                                            expanded={expandedAccordion === line.id}
                                            onChange={handleAccordionChange(line.id)}
                                        >
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Grid container alignItems="center" spacing={2}>
                                                    <Grid item xs={5} display="flex" alignItems="center" gap={1}>
                                                        {section.type === 'section' && <WorkIcon fontSize="small" color="action" />}
                                                        <Typography variant="subtitle2" fontWeight="bold">{line.name}</Typography>
                                                    </Grid>
                                                    <Grid item xs={4}>
                                                        <Box display="flex" alignItems="center" gap={2}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={Math.min((line.staffed / line.required) * 100, 100)}
                                                                sx={{ width: '100%', height: 8, borderRadius: 4 }}
                                                                color={isFull ? "success" : "warning"}
                                                            />
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={3} textAlign="right">
                                                        <Typography variant="body2" sx={{ color: statusColor, fontWeight: 'bold' }}>
                                                            {line.staffed} / {line.required} Filled
                                                        </Typography>
                                                    </Grid>
                                                </Grid>
                                            </AccordionSummary>

                                            <AccordionDetails sx={{ bgcolor: '#fafafa', p: 0 }}>
                                                <TableContainer>
                                                    <Table size="small">
                                                        <TableHead>
                                                            <TableRow>
                                                                <TableCell><strong>Ticket</strong></TableCell>
                                                                <TableCell><strong>Manager</strong></TableCell>
                                                                <TableCell><strong>Status</strong></TableCell>
                                                                <TableCell align="right"><strong>Contribution</strong></TableCell>
                                                                <TableCell align="right"><strong>View</strong></TableCell>
                                                            </TableRow>
                                                        </TableHead>
                                                        <TableBody>
                                                            {line.tickets.length === 0 ? (
                                                                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>No contribution yet.</TableCell></TableRow>
                                                            ) : (
                                                                line.tickets.map((ticket) => (
                                                                    <TableRow key={ticket.ticketId}>
                                                                        <TableCell>#{ticket.ticketId}</TableCell>
                                                                        <TableCell>{ticket.managerName}</TableCell>
                                                                        <TableCell><TicketStatusChip status={ticket.status} /></TableCell>
                                                                        <TableCell align="right"><Chip label={`+${ticket.contribution}`} size="small" variant="outlined" /></TableCell>
                                                                        <TableCell align="right">
                                                                            <Tooltip title="View List">
                                                                                <IconButton size="small" onClick={() => handleViewEmployees(ticket.employees)}>
                                                                                    <VisibilityIcon fontSize="small" />
                                                                                </IconButton>
                                                                            </Tooltip>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </TableBody>
                                                    </Table>
                                                </TableContainer>
                                            </AccordionDetails>
                                        </Accordion>
                                    );
                                })}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* TAB 1: TICKET LIST */}
                {tabValue === 1 && (
                    <Box>
                        <RequestTicketList request={request} onRefresh={loadData} />
                    </Box>
                )}
            </Box>

            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
            >
                <Box sx={{ width: 350, p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">Request Status</Typography>
                        <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon /></IconButton>
                    </Box>
                    <Divider sx={{ mb: 3 }} />
                    <RequestStatusTracker status={request.status} orientation="vertical" />
                </Box>
            </Drawer>

            <Dialog open={employeeModalOpen} onClose={() => setEmployeeModalOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Employee List <IconButton onClick={() => setEmployeeModalOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 0 }}>
                    <EmployeeListTable employees={selectedEmployeeList} />
                </DialogContent>
            </Dialog>
        </Container>
    );
}