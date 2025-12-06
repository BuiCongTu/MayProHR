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
    Paper, Grid, Chip, Stack, Divider, Drawer, IconButton,
    LinearProgress, Card, CardContent
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import FactoryIcon from '@mui/icons-material/Factory';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function OvertimeTicketDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const {subscribe, connected} = useWebSocket();
    const [ticket, setTicket] = useState(null);
    const [lineRequirements, setLineRequirements] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [drawerOpen, setDrawerOpen] = useState(false);

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

    // Flattened logic: Extract the single line data directly
    const lineData = useMemo(() => {
        if (!ticket || !ticket.employeeList) return null;

        // Group by line to find the distinct line (should only be one per ticket now)
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

        // Get the first group found (assuming 1 ticket = 1 line)
        const groupValues = Object.values(groups);
        if (groupValues.length > 0) {
            const g = groupValues[0];
            const assigned = g.employees.length;
            const progressVal = assigned > 0 ? Math.min((g.acceptedCount / assigned) * 100, 100) : 0;
            const isFullyAccepted = assigned > 0 && g.acceptedCount >= assigned;
            return { ...g, assigned, progressVal, isFullyAccepted };
        }

        return null;
    }, [ticket, lineRequirements]);

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
            default:
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
            {/* --- HEADER SECTION --- */}
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

            {/* --- LINE SUMMARY & STATISTICS --- */}
            {lineData ? (
                <Box sx={{mb: 3}}>
                    <Card variant="outlined" sx={{bgcolor: 'background.default'}}>
                        <CardContent>
                            <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} md={4}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <FactoryIcon color="action" />
                                        <Typography variant="h6" fontWeight="bold">
                                            {lineData.name}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary" sx={{ml: 4}}>
                                        Target Line for Overtime
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} md={8}>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="flex-end">
                                        <Box textAlign="center">
                                            <Typography variant="caption" color="text.secondary">Required</Typography>
                                            <Typography variant="h6">{lineData.required}</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem sx={{display: {xs: 'none', sm: 'block'}}} />
                                        <Box textAlign="center">
                                            <Typography variant="caption" color="text.secondary">Assigned</Typography>
                                            <Typography variant="h6" color="primary">{lineData.assigned}</Typography>
                                        </Box>
                                        <Divider orientation="vertical" flexItem sx={{display: {xs: 'none', sm: 'block'}}} />
                                        <Box textAlign="center">
                                            <Typography variant="caption" color="text.secondary">Accepted</Typography>
                                            <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Typography variant="h6" color={lineData.isFullyAccepted ? "success.main" : "text.primary"}>
                                                    {lineData.acceptedCount}
                                                </Typography>
                                                {lineData.isFullyAccepted && <CheckCircleIcon color="success" fontSize="small"/>}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </Grid>
                            </Grid>

                            <Box sx={{mt: 3, display: 'flex', alignItems: 'center'}}>
                                <Box sx={{width: '100%', mr: 1}}>
                                    <LinearProgress
                                        variant="determinate"
                                        value={lineData.progressVal}
                                        color={lineData.isFullyAccepted ? "success" : "primary"}
                                        sx={{height: 10, borderRadius: 5}}
                                    />
                                </Box>
                                <Box sx={{minWidth: 35}}>
                                    <Typography variant="body2" color="text.secondary">
                                        {Math.round(lineData.progressVal)}%
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            ) : (
                <Alert severity="warning" sx={{mb: 3}}>No line data or employees found for this ticket.</Alert>
            )}

            {/* --- EMPLOYEE LIST --- */}
            <Box sx={{width: '100%', bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1, p: 2}}>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <AssignmentIndIcon color="primary"/>
                    <Typography variant="h6">Assigned Employees</Typography>
                </Stack>
                <Divider sx={{mb: 1, bgcolor: 'black'}} variant='middle'/>

                {lineData && lineData.employees && lineData.employees.length > 0 ? (
                    <EmployeeListTable employees={lineData.employees}/>
                ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{py: 4}}>
                        No employees have been assigned to this ticket yet.
                    </Typography>
                )}
            </Box>

            {/* --- DRAWER (HISTORY) --- */}
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