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
    Divider, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningIcon from '@mui/icons-material/Warning';

export default function OvertimeTicketCreate() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    // Data States
    const [requests, setRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [deptEmployees, setDeptEmployees] = useState([]);

    // Hierarchy Data
    const [allLines, setAllLines] = useState([]);
    const [managedLineIds, setManagedLineIds] = useState(new Set());

    // Form States
    const [lines, setLines] = useState([]);
    const [allocations, setAllocations] = useState({});

    // Validation Caches
    const [backendConflicts, setBackendConflicts] = useState(new Map());

    // UI States
    const [loading, setLoading] = useState(false);
    const [loadingReq, setLoadingReq] = useState(true);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [autoFillModalOpen, setAutoFillModalOpen] = useState(false); // NEW MODAL
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
                const reqData = await getFilteredOvertimeRequest(
                    { status: 'open', departmentId: departmentId },
                    { page: 0, size: 50, sort: 'id,desc' }
                );

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

                const owned = new Set();
                const isManagerOf = (line) => {
                    if (String(line.managerId) === String(user.id)) return true;
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
    }, [user?.id, user?.departmentId]);

    const setupLinesForRequest = (req) => {
        if (req && req.lineDetails) {
            const initialLines = req.lineDetails.map(d => ({
                lineId: d.lineId,
                lineName: d.lineName || "Unknown Line",
                numEmployees: d.numEmployees || 0,
                serverAssigned: 0 // Assume 0 for new ticket to simplify "Fulfill Request" logic
            }));
            setLines(initialLines);
            setAllocations({});
            setBackendConflicts(new Map());
        } else {
            setLines([]);
            setAllocations({});
        }
    };

    // Filter visible lines (Hide Level 4)
    const visibleLines = lines.filter(l => {
        if (!managedLineIds.has(l.lineId)) return false;
        const lineDef = allLines.find(al => al.id === l.lineId);
        if (lineDef && lineDef.level === 4) return false;
        return true;
    });

    const handleRequestChange = (event, newValue) => {
        setSelectedRequest(newValue);
        setError(null);
        setupLinesForRequest(newValue);
    };

    // --- CONFLICT LOGIC ---
    const getSiblingConflict = (employee, targetLineId) => {
        if (!employee.lineId || !targetLineId) return null;
        if (employee.lineId === targetLineId) return null;

        const targetLine = allLines.find(l => l.id === targetLineId);
        const workerLine = allLines.find(l => l.id === employee.lineId);

        if (targetLine?.parentId && workerLine?.parentId) {
            if (targetLine.parentId === workerLine.parentId) {
                return `Sibling Block: Belongs to ${workerLine.name}`;
            }
        }
        return null;
    };

    const getUnavailableEmployeesMap = (targetLineId) => {
        const unavailable = new Map();
        backendConflicts.forEach((reason, id) => unavailable.set(id, reason));

        // Already allocated in THIS draft
        Object.keys(allocations).forEach(lId => {
            const lineIdInt = parseInt(lId);
            if (lineIdInt !== targetLineId) {
                allocations[lId].forEach(u => {
                    unavailable.set(u.id, `Draft: Assigned`);
                });
            }
        });

        deptEmployees.forEach(emp => {
            if (!unavailable.has(emp.id)) {
                const conflict = getSiblingConflict(emp, targetLineId);
                if (conflict) unavailable.set(emp.id, conflict);
            }
        });
        return unavailable;
    };

    // --- NEW: SMART AUTO-FILL ALGORITHM ---
    const handleAutoDistribute = () => {
        const newAllocations = { ...allocations };
        const usedEmployeeIds = new Set();

        // 1. Mark currently assigned as used
        Object.values(newAllocations).forEach(list => list.forEach(u => usedEmployeeIds.add(u.id)));

        // 2. PASS 1: Native Priority
        visibleLines.forEach(line => {
            const needed = Math.max(0, line.numEmployees - line.serverAssigned);
            let currentList = newAllocations[line.lineId] || [];

            if (currentList.length < needed) {
                const remainingNeeded = needed - currentList.length;

                // Find candidates: Native line, Not used, No Backend conflict
                const candidates = deptEmployees.filter(u =>
                    u.lineId === line.lineId &&
                    !usedEmployeeIds.has(u.id) &&
                    !backendConflicts.has(u.id)
                );

                const toAdd = candidates.slice(0, remainingNeeded);
                toAdd.forEach(u => usedEmployeeIds.add(u.id));
                newAllocations[line.lineId] = [...currentList, ...toAdd];
            }
        });

        // 3. PASS 2: Borrowing (Fill remaining gaps)
        visibleLines.forEach(line => {
            const needed = Math.max(0, line.numEmployees - line.serverAssigned);
            let currentList = newAllocations[line.lineId] || [];

            if (currentList.length < needed) {
                const remainingNeeded = needed - currentList.length;

                // Find candidates: Any line, Not used, No Sibling Conflict
                const candidates = deptEmployees.filter(u =>
                    !usedEmployeeIds.has(u.id) &&
                    !backendConflicts.has(u.id) &&
                    !getSiblingConflict(u, line.lineId)
                );

                const toAdd = candidates.slice(0, remainingNeeded);
                toAdd.forEach(u => usedEmployeeIds.add(u.id));
                newAllocations[line.lineId] = [...currentList, ...toAdd];
            }
        });

        setAllocations(newAllocations);
        setAutoFillModalOpen(false);
    };

    // --- MANUAL EDIT ---
    const openEmployeePicker = async (line) => {
        setCurrentEditingLine(line);
        setCheckingAvailability(true);

        const employeeIdsToCheck = deptEmployees.map(u => u.id);
        if (selectedRequest && employeeIdsToCheck.length > 0) {
            try {
                const response = await checkEmployeeAvailability(selectedRequest.id, employeeIdsToCheck);
                const conflictMap = new Map();
                if (Array.isArray(response)) {
                    response.forEach(res => {
                        if (!res.available) conflictMap.set(res.employeeId, res.reason);
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

    // --- VALIDATION GATE ---
    // Identify lines that haven't met their target
    const missingLines = visibleLines.filter(line => {
        const required = line.numEmployees - line.serverAssigned;
        const current = (allocations[line.lineId] || []).length;
        return current < required;
    });

    const isFulfillingRequest = missingLines.length === 0;

    const handleSubmit = async () => {
        if (!selectedRequest) return;
        if (!isFulfillingRequest) {
            setError("Cannot submit: You must fulfill the requested number of employees for all lines.");
            return;
        }

        const activeAllocations = visibleLines
            .map(l => ({
                lineId: l.lineId,
                employeeIds: (allocations[l.lineId] || []).map(u => u.id)
            }))
            .filter(a => a.employeeIds.length > 0);

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
                    />
                </Paper>

                {selectedRequest && (
                    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                                STEP 2: MANAGE STAFFING
                            </Typography>
                            {/* AUTO-FILL BUTTON */}
                            <Button
                                variant="outlined"
                                startIcon={<AutoFixHighIcon />}
                                onClick={() => setAutoFillModalOpen(true)}
                                size="small"
                            >
                                Auto-Fill Roster
                            </Button>
                        </Stack>

                        {visibleLines.length > 0 ? (
                            <TableContainer sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                <Table>
                                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                                        <TableRow>
                                            <TableCell width="30%"><strong>Line Name</strong></TableCell>
                                            <TableCell width="20%"><strong>Status</strong></TableCell>
                                            <TableCell width="30%"><strong>Counts</strong></TableCell>
                                            <TableCell width="20%" align="right"><strong>Actions</strong></TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {visibleLines.map((line) => {
                                            const draftCount = (allocations[line.lineId] || []).length;
                                            const totalRequired = line.numEmployees; // Original requested
                                            const isMet = draftCount >= totalRequired;

                                            return (
                                                <TableRow key={line.lineId} hover>
                                                    <TableCell>
                                                        <Typography variant="body1" fontWeight="bold">{line.lineName}</Typography>
                                                    </TableCell>

                                                    <TableCell>
                                                        {isMet ? (
                                                            <Chip icon={<CheckCircleIcon fontSize="small"/>} label="Ready" color="success" size="small" variant="outlined" />
                                                        ) : (
                                                            <Chip icon={<WarningIcon fontSize="small"/>} label="Missing" color="error" size="small" variant="outlined" />
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Typography variant="body2">
                                                            Assigned: <strong style={{ color: isMet ? 'green' : 'red' }}>{draftCount}</strong> / {totalRequired}
                                                        </Typography>
                                                    </TableCell>

                                                    <TableCell align="right">
                                                        <Button
                                                            variant={draftCount > 0 ? "outlined" : "contained"}
                                                            size="small"
                                                            startIcon={
                                                                checkingAvailability && currentEditingLine?.lineId === line.lineId
                                                                    ? <CircularProgress size={20} color="inherit" />
                                                                    : <EditIcon />
                                                            }
                                                            onClick={() => openEmployeePicker(line)}
                                                            disabled={checkingAvailability}
                                                        >
                                                            {draftCount > 0 ? "Edit" : "Assign"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                No lines to staff.
                            </Alert>
                        )}

                        {/* HARD BLOCK WARNING */}
                        {!isFulfillingRequest && visibleLines.length > 0 && (
                            <Alert severity="error" sx={{ mt: 3 }} icon={<WarningIcon />}>
                                <strong>Request Not Fulfilled:</strong> You must assign enough workers to the following lines before submitting:
                                <ul style={{ margin: '8px 0 0 20px' }}>
                                    {missingLines.map(l => (
                                        <li key={l.lineId}>{l.lineName} (Needs {l.numEmployees}, has {(allocations[l.lineId]||[]).length})</li>
                                    ))}
                                </ul>
                            </Alert>
                        )}

                        {error && <Alert severity="error" sx={{ mt: 3 }}>{error}</Alert>}

                        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="text" color="inherit" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={loading ? <CircularProgress size={24} color="inherit"/> : <SaveIcon />}
                                onClick={handleSubmit}
                                // THE HARD BLOCK
                                disabled={loading || !isFulfillingRequest || visibleLines.length === 0}
                                sx={{ px: 4 }}
                            >
                                Create Ticket
                            </Button>
                        </Box>
                    </Paper>
                )}
            </Paper>

            {/* EMPLOYEE PICKER MODAL */}
            <EmployeeTransferList
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title={currentEditingLine ? `Assign Staff: ${currentEditingLine.lineName}` : ''}
                allEmployees={deptEmployees}
                initialSelected={currentEditingLine ? (allocations[currentEditingLine.lineId] || []) : []}
                unavailableEmployees={currentEditingLine ? getUnavailableEmployeesMap(currentEditingLine.lineId) : new Map()}
                requestedCount={currentEditingLine ? currentEditingLine.numEmployees : 0}
                targetLineId={currentEditingLine ? currentEditingLine.lineId : null}
                onSave={handleSaveAllocation}
            />

            {/* NEW: AUTO-FILL CONFIRMATION MODAL */}
            <Dialog open={autoFillModalOpen} onClose={() => setAutoFillModalOpen(false)}>
                <DialogTitle>Auto-Fill Roster?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will automatically distribute available employees to fill all requested lines.
                        <br/><br/>
                        <strong>Pass 1:</strong> Assign native workers to their own lines.<br/>
                        <strong>Pass 2:</strong> Fill remaining gaps with available borrowed workers.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAutoFillModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleAutoDistribute} variant="contained" autoFocus>
                        Run Auto-Fill
                    </Button>
                </DialogActions>
            </Dialog>

        </Container>
    );
}