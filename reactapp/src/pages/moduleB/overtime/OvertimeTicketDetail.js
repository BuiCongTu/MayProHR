import React, {useState, useEffect, useMemo} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {
    getOvertimeTicketById,
    getOvertimeRequestById
} from '../../../services/moduleB/overtimeService';
import TicketStatusTracker from '../../../components/moduleB/TicketStatusTracker';
import EmployeeListTable from './EmployeeList';
import {useWebSocket} from '../../../contexts/WebSocketContext';
import { getCurrentUser } from '../../../services/authService';

import {
    Box, CircularProgress, Typography, Alert, Button, Container,
    Paper, Grid, Chip, Stack, Divider, Drawer, IconButton,
    LinearProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';

import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import FactoryIcon from '@mui/icons-material/Factory';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function OvertimeTicketDetail() {
    const {id} = useParams();
    const navigate = useNavigate();
    const {subscribe, connected} = useWebSocket();
    const user = getCurrentUser();

    const [ticket, setTicket] = useState(null);
    const [lineRequirements, setLineRequirements] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const loadData = async () => {
        setError(null);
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
        if (!user || !user.id) return;
        loadData();
    }, [id, user?.id, connected]);

    // --- FIX: Return Array of Lines, not just the first one ---
    const linesData = useMemo(() => {
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

        // Convert Map to Array & Calculate Stats for EACH line
        return Object.values(groups).map(g => {
            const assigned = g.employees.length;
            const progressVal = assigned > 0 ? Math.min((g.acceptedCount / assigned) * 100, 100) : 0;
            const isFullyAccepted = assigned > 0 && g.acceptedCount >= assigned;

            return { ...g, assigned, progressVal, isFullyAccepted };
        }).sort((a, b) => a.name.localeCompare(b.name)); // Sort A-Z

    }, [ticket, lineRequirements]);

    const getStatusChip = (status) => {
        let color = 'default';
        let label = status?.toUpperCase() || 'UNKNOWN';
        switch (status?.toLowerCase()) {
            case 'submitted': color = 'info'; break;
            case 'approved': color = 'success'; break;
            case 'rejected': color = 'error'; break;
        }
        return <Chip label={label} color={color} sx={{fontWeight: 'bold', borderRadius: 1}}/>;
    };

    const fmtTime = (t) => t ? t.substring(0, 5) : '';

    if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress/></Box>;
    if (error) return <Box p={5}><Alert severity="error">{error}</Alert></Box>;
    if (!ticket) return null;

    return (
        <Container maxWidth="lg" sx={{mt: 2, mb: 8}}>
            {/* HEADER */}
            <Paper elevation={2} sx={{p: 3, mb: 3, borderRadius: 2, borderTop: '4px solid #1976d2'}}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Button startIcon={<ArrowBackIcon/>} onClick={() => navigate('/overtime-ticket')} sx={{color: 'text.secondary'}}>Back</Button>
                    {/*<Button variant="outlined" startIcon={<HistoryIcon/>} onClick={() => setDrawerOpen(true)}>History</Button>*/}
                </Stack>
                <Divider sx={{mb: 2}}/>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                            <Typography variant="h4" fontWeight="bold" color="primary.main">Ticket #{ticket.id}</Typography>
                            {getStatusChip(ticket.status)}
                        </Stack>
                        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                            Request Ref: <strong>#{ticket.requestId}</strong> • {ticket.departmentName}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={2}>
                            <Chip icon={<CalendarTodayIcon fontSize='small'/>} label={ticket.overtimeDate} variant="outlined" size="small"/>
                            <Chip icon={<AccessTimeIcon fontSize='small'/>} label={`${fmtTime(ticket.startTime)} - ${fmtTime(ticket.endTime)}`} variant="outlined" size="small"/>
                        </Stack>
                    </Grid>
                </Grid>
            </Paper>

            {/* --- MULTI-LINE RENDERER --- */}
            {linesData.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {linesData.map((line) => (
                        <Paper key={line.id} elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            {/* LINE HEADER CARD */}
                            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                                <Grid container alignItems="center" spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <FactoryIcon color="primary" />
                                            <Typography variant="h6" fontWeight="bold">
                                                {line.name}
                                            </Typography>
                                        </Stack>
                                    </Grid>

                                    <Grid item xs={12} md={8}>
                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="flex-end" alignItems="center">
                                            {/* Progress Bar Area */}
                                            <Box sx={{ flex: 1, width: '100%', mr: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                                                    <Typography variant="caption" color="text.secondary">Worker Acceptance</Typography>
                                                    <Typography variant="caption" fontWeight="bold">{Math.round(line.progressVal)}%</Typography>
                                                </Stack>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={line.progressVal}
                                                    color={line.isFullyAccepted ? "success" : "primary"}
                                                    sx={{height: 8, borderRadius: 4}}
                                                />
                                            </Box>

                                            {/* Stats */}
                                            <Box textAlign="center" minWidth={60}>
                                                <Typography variant="caption" color="text.secondary">Req</Typography>
                                                <Typography variant="h6">{line.required}</Typography>
                                            </Box>
                                            <Divider orientation="vertical" flexItem />
                                            <Box textAlign="center" minWidth={60}>
                                                <Typography variant="caption" color="text.secondary">Assigned</Typography>
                                                <Typography variant="h6" color="primary">{line.assigned}</Typography>
                                            </Box>
                                            <Divider orientation="vertical" flexItem />
                                            <Box textAlign="center" minWidth={60}>
                                                <Typography variant="caption" color="text.secondary">Accepted</Typography>
                                                <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                                                    <Typography variant="h6" color={line.isFullyAccepted ? "success.main" : "text.primary"}>
                                                        {line.acceptedCount}
                                                    </Typography>
                                                    {line.isFullyAccepted && <CheckCircleIcon color="success" fontSize="small"/>}
                                                </Stack>
                                            </Box>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </Box>

                            {/* EMPLOYEE TABLE FOR THIS LINE */}
                            <Accordion defaultExpanded elevation={0} disableGutters>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle2" color="text.secondary">View {line.assigned} Employees</Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{ p: 0 }}>
                                    <EmployeeListTable employees={line.employees}/>
                                </AccordionDetails>
                            </Accordion>
                        </Paper>
                    ))}
                </Box>
            ) : (
                <Alert severity="warning">No employees found in this ticket.</Alert>
            )}

            {/*<Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>*/}
            {/*    <Box sx={{width: 350, p: 3}}>*/}
            {/*        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>*/}
            {/*            <Typography variant="h6" fontWeight="bold">Status Tracker</Typography>*/}
            {/*            <IconButton onClick={() => setDrawerOpen(false)}><CloseIcon/></IconButton>*/}
            {/*        </Box>*/}
            {/*        <Divider sx={{mb: 3}}/>*/}
            {/*        <TicketStatusTracker status={ticket.status} orientation="vertical"/>*/}
            {/*    </Box>*/}
            {/*</Drawer>*/}
        </Container>
    );
}