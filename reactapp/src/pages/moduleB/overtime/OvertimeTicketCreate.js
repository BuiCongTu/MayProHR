import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFilteredOvertimeRequest, createOvertimeTicket, checkEmployeeAvailability } from '../../../services/moduleB/overtimeService';
import { getUsersByDepartment } from '../../../services/userService';
import { getLinesByDepartment } from '../../../services/departmentService';
import { getCurrentUser } from '../../../services/authService';
import EmployeeTransferList from './EmployeeTransferList';

import {
    Box, Container, Paper, Typography, Autocomplete, TextField,
    Button, Alert, CircularProgress, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip,
    Divider
} from '@mui/material';

import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function OvertimeTicketCreate() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    // Data States
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [deptEmployees, setDeptEmployees] = useState([]);

    // Hierarchy Data (For Client-Side Sibling Checks)
    const [allLines, setAllLines] = useState([]);
    const [managedLineIds, setManagedLineIds] = useState(new Set());

    // Form States
    const [lines, setLines] = useState([]);
    const [allocations, setAllocations] = useState({}); // { [lineId]: [employees] }

    // Validation Caches
    const [backendConflicts, setBackendConflicts] = useState(new Map()); // Map<empId, reason>

    // UI States
    const [loading, setLoading] = useState(false);
    const [loadingReq, setLoadingReq] = useState(true);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [currentEditingLine, setCurrentEditingLine] = useState(null);
    const [error, setError] = useState(null);

    // 1. Load Data
    useEffect(() => {
        let isMounted = true;

        async function init() {
            if (!user) {
                if (isMounted) setError("User not authenticated.");
                return;
            }

            const departmentId = user.departmentId;

            try {
                // A. Fetch Requests
                const reqData = await getFilteredOvertimeRequest(
                    { status: 'open', departmentId: departmentId },
                    { page: 0, size: 50, sort: 'id,desc' }
                );

                // B. Fetch Employees & Lines
                const usersPromise = departmentId ? getUsersByDepartment(departmentId) : Promise.resolve([]);
                const linesPromise = departmentId ? getLinesByDepartment(departmentId) : Promise.resolve([]);

                const [fetchedRequests, fetchedUsers, fetchedLines] = await Promise.all([
                    Promise.resolve(reqData.content || []),
                    usersPromise,
                    linesPromise
                ]);

                if (!isMounted) return;

                setRequests(fetchedRequests);
                setDeptEmployees(fetchedUsers || []);
                setAllLines(fetchedLines || []);

                // C. Determine Owned Lines (Hierarchy Aware)
                const owned = new Set();

                // Helper to check ancestry
                const isManagerOf = (line) => {
                    // Direct manager?
                    if (String(line.managerId) === String(user.id)) return true;
                    // Ancestor manager?
                    let parentId = line.parentId;
                    while (parentId) {
                        const parent = fetchedLines.find(l => l.id === parentId);
                        if (parent && String(parent.managerId) === String(user.id)) return true;
                        parentId = parent ? parent.parentId : null;
                    }
                    return false;
                };

                fetchedLines.forEach(l => {
                    if (isManagerOf(l)) {
                        owned.add(l.id);
                    }
                });
                setManagedLineIds(owned);

                // D. Handle Pre-selection
                if (location.state?.preselectedRequestId) {
                    const targetReq = fetchedRequests.find(r => r.id === location.state.preselectedRequestId);
                    if (targetReq) {
                        setSelectedRequest(targetReq);
                        setupLinesForRequest(targetReq);
                    }
                }

            } catch (err) {
                console.error(err);
                if (isMounted) setError("Failed to initialize data.");
            } finally {
                if (isMounted) setLoadingReq(false);
            }
        }

        init();
        return () => { isMounted = false; };
    }, [user?.id, user?.departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Helper: Count Server Assignments
    const getServerAssignedCount = (req, lineId) => {
        if (!req || !req.overtimeTickets) return 0;
        let count = 0;
        req.overtimeTickets.forEach(ticket => {
            if (ticket.status !== 'rejected') {
                count += 0;
            }
        });
        return count;
    };

    const setupLinesForRequest = (req) => {
        if (req && req.lineDetails) {
            const initialLines = req.lineDetails.map(d => ({
                lineId: d.lineId,
                lineName: d.lineName || "Unknown Line",
                numEmployees: d.numEmployees || 0, // Safe Fallback
                serverAssigned: getServerAssignedCount(req, d.lineId)
            }));
            setLines(initialLines);
            setAllocations({});
            setBackendConflicts(new Map());
        } else {
            setLines([]);
            setAllocations({});
        }
    };

    const visibleLines = lines.filter(l => managedLineIds.has(l.lineId));

    const handleRequestChange = (event, newValue) => {
        setSelectedRequest(newValue);
        setError(null);
        setupLinesForRequest(newValue);
    };

    // --- HYBRID AVAILABILITY CHECK ---

    // 1. Client-Side Sibling Check
    const getSiblingConflict = (employee, targetLineId) => {
        if (!employee.lineId || !targetLineId) return null;
        if (employee.lineId === targetLineId) return null; // Native = OK

        const targetLine = allLines.find(l => l.id === targetLineId);
        const workerLine = allLines.find(l => l.id === employee.lineId);

        // If both lines exist and share a parent (Level 4), they are siblings -> BLOCK
        if (targetLine?.parentId && workerLine?.parentId) {
            if (targetLine.parentId === workerLine.parentId) {
                return `Sibling Block: Belongs to ${workerLine.name}`;
            }
        }
        return null;
    };

    // 2. Open Picker & Check Backend
    const openEmployeePicker = async (line) => {
        setCurrentEditingLine(line);
        setCheckingAvailability(true);

        const employeeIdsToCheck = deptEmployees.map(u => u.id);

        if (selectedRequest && employeeIdsToCheck.length > 0) {
            try {
                // Call Backend for: Weekly Limits, Time Conflicts, Active Cousin Lock
                const response = await checkEmployeeAvailability(selectedRequest.id, employeeIdsToCheck);

                const conflictMap = new Map();
                // Response is List<AvailabilityCheckDTO.Response>
                if (Array.isArray(response)) {
                    response.forEach(res => {
                        if (!res.available) {
                            conflictMap.set(res.employeeId, res.reason);
                        }
                    });
                }
                setBackendConflicts(conflictMap);

            } catch (err) {
                console.error("Availability check failed", err);
            }
        }

        setCheckingAvailability(false);
        setModalOpen(true);
    };

    // 3. Build Final Unavailable Map (Backend + Draft + Sibling)
    const getUnavailableEmployeesMap = (targetLineId) => {
        const unavailable = new Map();

        // A. Backend Conflicts (Time, Weekly Limit)
        backendConflicts.forEach((reason, id) => unavailable.set(id, reason));

        // B. Frontend Draft Conflicts (Double Booking)
        Object.keys(allocations).forEach(lId => {
            const lineIdInt = parseInt(lId);
            if (lineIdInt !== targetLineId) {
                const lineObj = lines.find(l => l.lineId === lineIdInt);
                const lineName = lineObj ? lineObj.lineName : 'another line';
                allocations[lId].forEach(u => {
                    unavailable.set(u.id, `Draft: Assigned to ${lineName}`);
                });
            }
        });

        // C. Frontend Sibling Conflicts (Immediate)
        deptEmployees.forEach(emp => {
            if (!unavailable.has(emp.id)) {
                const conflict = getSiblingConflict(emp, targetLineId);
                if (conflict) unavailable.set(emp.id, conflict);
            }
        });

        return unavailable;
    };


    const handleSaveAllocation = (selectedUsers) => {
        if (currentEditingLine) {
            setAllocations(prev => ({
                ...prev,
                [currentEditingLine.lineId]: selectedUsers
            }));
        }
        setModalOpen(false);
        setCurrentEditingLine(null);
    };

    const handleSubmit = async () => {
        if (!selectedRequest) return;

        const activeAllocations = visibleLines
            .map(l => ({
                lineId: l.lineId,
                employeeIds: (allocations[l.lineId] || []).map(u => u.id)
            }))
            .filter(a => a.employeeIds.length > 0);

        if (activeAllocations.length === 0) {
            setError("You haven't assigned any employees yet.");
            return;
        }

        const payload = {
            requestId: selectedRequest.id,
            managerId: user.id,
            allocations: activeAllocations
        };

        setLoading(true);
        setError(null);

        try {
            await createOvertimeTicket(payload);
            alert("Ticket created successfully!");
            navigate('/overtime-ticket');
        } catch (err) {
            const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Paper elevation={0} sx={{ p: 0, bgcolor: 'transparent' }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                    <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ color: 'text.secondary' }}>
                        Back
                    </Button>
                    <Typography variant="h5" fontWeight="bold" color="text.primary">Create Overtime Ticket</Typography>
                </Stack>

                <Paper elevation={2} sx={{ p: 3, mb: 4, borderRadius: 2 }}>
                    <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                        STEP 1: SELECT REQUEST
                    </Typography>
                    <Autocomplete
                        id="request-select"
                        options={requests}
                        getOptionLabel={(option) => `Req #${option.id} (${option.overtimeDate})`}
                        value={selectedRequest}
                        onChange={handleRequestChange}
                        loading={loadingReq}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Search Open Requests..." fullWidth variant="outlined" />
                        )}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Stack>
                                    <Typography variant="body1" fontWeight="bold">
                                        Request #{option.id} — {option.overtimeDate}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {option.startTime.substring(0,5)} to {option.endTime.substring(0,5)} • {option.departmentName}
                                    </Typography>
                                </Stack>
                            </li>
                        )}
                    />
                </Paper>

                {selectedRequest && (
                    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                            STEP 2: MANAGE STAFFING
                        </Typography>

                        {visibleLines.length > 0 ? (
                            <TableContainer sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell width="25%"><strong>Line Name</strong></TableCell>
                                            <TableCell width="15%"><strong>Status</strong></TableCell>
                                            <TableCell width="40%"><strong>Staffing Overview</strong></TableCell>
                                            <TableCell width="20%" align="right"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {visibleLines.map((line) => {
                                            const draftCount = (allocations[line.lineId] || []).length;
                                            const serverCount = line.serverAssigned;
                                            const totalRequired = line.numEmployees;
                                            const availableSlots = Math.max(0, totalRequired - serverCount);
                                            const isOverLimit = draftCount > availableSlots;
                                            const isQuotaFull = availableSlots === 0;

                                            return (
                                                <TableRow key={line.lineId} hover>
                                                    <TableCell>
                                                        <Typography variant="body1" fontWeight="bold">{line.lineName}</Typography>
                                                        <Typography variant="caption" color="text.secondary">ID: {line.lineId}</Typography>
                                                    </TableCell>

                                                    <TableCell>
                                                        {isQuotaFull ? (
                                                            <Chip icon={<CheckCircleIcon fontSize="small"/>} label="Quota Full" color="success" size="small" variant="outlined" />
                                                        ) : (
                                                            <Chip label="Open" color="primary" size="small" variant="outlined" />
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Stack direction="row" spacing={3} alignItems="center" divider={<Divider orientation="vertical" flexItem />}>
                                                            <Box sx={{ minWidth: 80 }}>
                                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>REQUESTED</Typography>
                                                                <Typography variant="h6" fontWeight="bold">{totalRequired}</Typography>
                                                            </Box>
                                                            <Box sx={{ minWidth: 80 }}>
                                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>REMAINING</Typography>
                                                                <Typography variant="h6" fontWeight="bold" color={isQuotaFull ? "text.disabled" : "success.main"}>{availableSlots}</Typography>
                                                            </Box>
                                                            <Box sx={{ minWidth: 80 }}>
                                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>SELECTED</Typography>
                                                                <Typography variant="h6" fontWeight="bold" color={isOverLimit ? "error.main" : "primary.main"}>{draftCount}</Typography>
                                                            </Box>
                                                        </Stack>
                                                    </TableCell>

                                                    <TableCell align="right">
                                                        <Button
                                                            variant={draftCount > 0 ? "outlined" : "contained"}
                                                            size="small"
                                                            startIcon={
                                                                checkingAvailability && currentEditingLine?.lineId === line.lineId
                                                                    ? <CircularProgress size={20} color="inherit" />
                                                                    : (draftCount > 0 ? <EditIcon /> : <PersonAddIcon />)
                                                            }
                                                            onClick={() => openEmployeePicker(line)}
                                                            disabled={(isQuotaFull && draftCount === 0) || checkingAvailability}
                                                            color={isOverLimit ? "error" : "primary"}
                                                        >
                                                            {draftCount > 0 ? "Edit List" : "Add Staff"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                                This Request does not require staffing from any lines you currently manage.
                            </Alert>
                        )}

                        {error && <Alert severity="error" sx={{ mt: 3, whiteSpace: 'pre-wrap' }}>{error}</Alert>}

                        {visibleLines.some(l => (allocations[l.lineId] || []).length > 0) && (
                            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                                <Button variant="text" color="inherit" onClick={() => navigate(-1)}>
                                    Cancel
                                </Button>
                                <Button
                                    variant="contained"
                                    size="large"
                                    startIcon={loading ? <CircularProgress size={24} color="inherit"/> : <SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    sx={{ px: 4 }}
                                >
                                    Create Ticket
                                </Button>
                            </Box>
                        )}
                    </Paper>
                )}
            </Paper>

            <EmployeeTransferList
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={currentEditingLine ? `Assign Staff: ${currentEditingLine.lineName}` : ''}
                allEmployees={deptEmployees}
                initialSelected={currentEditingLine ? (allocations[currentEditingLine.lineId] || []) : []}
                unavailableEmployees={currentEditingLine ? getUnavailableEmployeesMap(currentEditingLine.lineId) : new Map()}
                requestedCount={currentEditingLine ? Math.max(0, currentEditingLine.numEmployees - currentEditingLine.serverAssigned) : 0}
                targetLineId={currentEditingLine ? currentEditingLine.lineId : null}
                onSave={handleSaveAllocation}
            />
        </Container>
    );
}