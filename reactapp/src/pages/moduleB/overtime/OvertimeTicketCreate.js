import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    getFilteredOvertimeRequest,
    createOvertimeTicket,
    checkEmployeeAvailability,
    getOvertimeRequestById
} from '../../../services/moduleB/overtimeService';
import { getUsersByDepartment } from '../../../services/userService';
import { getLinesByDepartment } from '../../../services/departmentService';
import { getCurrentUser } from '../../../services/authService';
import EmployeeTransferList from './EmployeeTransferList';

import {
    Box, Container, Paper, Typography, Autocomplete, TextField,
    Button, Alert, CircularProgress, Stack, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Chip,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';

import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import WarningIcon from '@mui/icons-material/Warning';
import BlockIcon from '@mui/icons-material/Block';

export default function OvertimeTicketCreate() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = getCurrentUser();

    // Data States
    const [requestList, setRequestList] = useState([]);
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
    const [loadingDetail, setLoadingDetail] = useState(false); // <--- ADDED
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [autoFillModalOpen, setAutoFillModalOpen] = useState(false);
    const [currentEditingLine, setCurrentEditingLine] = useState(null);
    const [error, setError] = useState(null);

    // 1. Load Initial Data (Dropdown & Dept)
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

                setRequestList(fetchedRequests);
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
                    handleRequestChange(null, { id: location.state.preselectedRequestId });
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

    // 2. Fetch Fresh Details & Calculate Gaps
    const handleRequestChange = async (event, newValue) => {
        if (!newValue) {
            setSelectedRequest(null);
            setLines([]);
            setAllocations({});
            return;
        }

        setLoadingDetail(true);
        setError(null);

        try {
            // Fetch LIVE data to calculate gaps correctly
            const freshRequest = await getOvertimeRequestById(newValue.id);
            setSelectedRequest(freshRequest);
            processRequestLines(freshRequest);
        } catch (err) {
            console.error(err);
            setError("Could not load request details.");
        } finally {
            setLoadingDetail(false);
        }
    };

    const processRequestLines = (req) => {
        if (!req || !req.lineDetails) return;

        // Calculate ACTIVE employees (Pending + Accepted + Submitted)
        const activeCounts = {};
        if (req.overtimeTickets) {
            req.overtimeTickets.forEach(t => {
                if (t.status !== 'rejected' && t.employeeList) {
                    t.employeeList.forEach(emp => {
                        // Count active seats. Ignore rejected employees (they create gaps).
                        if (emp.lineId && emp.status !== 'rejected') {
                            activeCounts[emp.lineId] = (activeCounts[emp.lineId] || 0) + 1;
                        }
                    });
                }
            });
        }

        const initialLines = req.lineDetails.map(d => ({
            lineId: d.lineId,
            lineName: d.lineName || "Unknown Line",
            numEmployees: d.numEmployees || 0,
            activeCount: activeCounts[d.lineId] || 0
        }));

        setLines(initialLines);
        setAllocations({});
        setBackendConflicts(new Map());
    };

    const visibleLines = lines.filter(l => {
        if (!managedLineIds.has(l.lineId)) return false;
        const lineDef = allLines.find(al => al.id === l.lineId);
        if (lineDef && lineDef.level === 4) return false;
        return true;
    });

    // --- CONFLICT LOGIC ---
    // unused
    const getSiblingConflict = (employee, targetLineId) => {
        // if (!employee.lineId || !targetLineId) return null;
        // if (employee.lineId === targetLineId) return null;
        //
        // const targetLine = allLines.find(l => l.id === targetLineId);
        // const workerLine = allLines.find(l => l.id === employee.lineId);
        //
        // if (targetLine?.parentId && workerLine?.parentId) {
        //     if (targetLine.parentId === workerLine.parentId) {
        //         return `Sibling Block: Belongs to ${workerLine.name}`;
        //     }
        // }
        return null;
    };

    const getActiveLockConflict = (employee, targetLineId) => {
        if (!employee.lineId || !targetLineId) return null;

        if (employee.lineId === targetLineId) return null;

        const isHomeLineActive = lines.some(l => l.lineId === employee.lineId);

        if (isHomeLineActive) {
            const homeLine = allLines.find(l => l.id === employee.lineId);
            const lineName = homeLine ? homeLine.name : "Active Line";
            return `Active Lock: Reserved for ${lineName}`;
        }

        return null;
    };

    const getUnavailableEmployeesMap = (targetLineId) => {
        const unavailable = new Map();
        backendConflicts.forEach((reason, id) => unavailable.set(id, reason));

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
                const conflict = getActiveLockConflict(emp, targetLineId);
                if (conflict) unavailable.set(emp.id, conflict);
            }
        });
        return unavailable;
    };

    // --- AUTO-FILL ---
    const handleAutoDistribute = () => {
        const newAllocations = { ...allocations };
        const usedEmployeeIds = new Set();
        Object.values(newAllocations).forEach(list => list.forEach(u => usedEmployeeIds.add(u.id)));

        visibleLines.forEach(line => {
            const gap = Math.max(0, line.numEmployees - line.activeCount);
            if (gap <= 0) return;

            let currentList = newAllocations[line.lineId] || [];
            if (currentList.length < gap) {
                const needed = gap - currentList.length;

                // 1. Native
                const native = deptEmployees.filter(u =>
                    u.lineId === line.lineId && !usedEmployeeIds.has(u.id) && !backendConflicts.has(u.id)
                );
                const addNative = native.slice(0, needed);
                addNative.forEach(u => usedEmployeeIds.add(u.id));
                currentList = [...currentList, ...addNative];

                // 2. Borrow
                if (currentList.length < gap) {
                    const stillNeeded = gap - currentList.length;
                    const borrowed = deptEmployees.filter(u =>
                        !usedEmployeeIds.has(u.id) && !backendConflicts.has(u.id) && !getSiblingConflict(u, line.lineId)
                    );
                    const addBorrow = borrowed.slice(0, stillNeeded);
                    addBorrow.forEach(u => usedEmployeeIds.add(u.id));
                    currentList = [...currentList, ...addBorrow];
                }
                newAllocations[line.lineId] = currentList;
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

    // --- STRICT GATE VALIDATION ---
    const getValidationStatus = (line) => {
        const gap = Math.max(0, line.numEmployees - line.activeCount);
        const draft = (allocations[line.lineId] || []).length;
        const isLineFull = gap === 0;

        // If line is Full, we shouldn't add more.
        if (isLineFull) {
            return { isValid: draft === 0, msg: "Line is full." };
        }

        // FRESH TICKET (Active == 0): Must Fill Completely.
        if (line.activeCount === 0) {
            return {
                isValid: draft === gap,
                msg: `Fresh Ticket: Must select exactly ${gap} employees.`
            };
        }

        // MAINTENANCE (Active > 0): Filling Gaps. Can select 1 to Gap.
        // If Gap > 0, you must select at least 1 IF you decide to edit it,
        // OR select 0 if you are ignoring this line for now (Valid use case for multi-line request).
        // BUT strict requirement "Complete fulfillment" implies ignoring lines with gaps is bad?
        // Let's enforce: If you have a gap, you must fill it partially or fully. (Draft > 0)
        return {
            isValid: draft > 0 && draft <= gap,
            msg: `Maintenance: Fill 1 to ${gap} slots.`
        };
    };

    // Global Check
    const invalidLines = visibleLines.filter(line => {
        const status = getValidationStatus(line);
        // We only care about lines that HAVE gaps.
        const gap = Math.max(0, line.numEmployees - line.activeCount);
        if (gap === 0) return (allocations[line.lineId] || []).length > 0; // Invalid if trying to overstuff
        return !status.isValid;
    });

    const isGateOpen = invalidLines.length === 0;
    const hasAllocation = Object.values(allocations).some(l => l.length > 0);

    const handleSubmit = async () => {
        if (!selectedRequest) return;
        if (!isGateOpen) {
            setError("Validation Failed: Please follow strict gap filling rules.");
            return;
        }
        if (!hasAllocation) {
            setError("Ticket is empty.");
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
                        options={requestList} // Dropdown list
                        getOptionLabel={(option) => `Req #${option.id} (${option.overtimeDate})`}
                        value={requestList.find(r => r.id === selectedRequest?.id) || null}
                        onChange={handleRequestChange}
                        loading={loadingReq}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                            <TextField {...params} placeholder="Search Open Requests..." fullWidth variant="outlined" />
                        )}
                    />
                    {loadingDetail && <CircularProgress size={24} sx={{ mt: 2 }} />}
                </Paper>

                {selectedRequest && !loadingDetail && (
                    <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle2" color="primary" fontWeight="bold">
                                STEP 2: STAFFING (Gap Filling)
                            </Typography>
                            {/* Auto-Fill only useful if there are gaps */}
                            <Button
                                variant="outlined"
                                startIcon={<AutoFixHighIcon />}
                                onClick={() => setAutoFillModalOpen(true)}
                                size="small"
                            >
                                Auto-Fill Gaps
                            </Button>
                        </Stack>

                        <TableContainer sx={{ mt: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                            <Table>
                                <TableHead sx={{ bgcolor: 'grey.50' }}>
                                    <TableRow>
                                        <TableCell><strong>Line</strong></TableCell>
                                        <TableCell><strong>Status</strong></TableCell>
                                        <TableCell><strong>Counts</strong></TableCell>
                                        <TableCell align="right"><strong>Action</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visibleLines.map((line) => {
                                        const draft = (allocations[line.lineId] || []).length;
                                        const gap = Math.max(0, line.numEmployees - line.activeCount);
                                        const isLineFull = gap === 0;
                                        const status = getValidationStatus(line);

                                        return (
                                            <TableRow key={line.lineId} hover>
                                                <TableCell>{line.lineName}</TableCell>

                                                <TableCell>
                                                    {isLineFull && draft === 0 ? <Chip label="Full" icon={<BlockIcon/>} size="small"/> :
                                                        status.isValid ? <Chip label="Ready" color="success" icon={<CheckCircleIcon/>} size="small"/> :
                                                            <Chip label="Action Needed" color="error" icon={<WarningIcon/>} size="small"/>}
                                                </TableCell>

                                                <TableCell>
                                                    <Stack spacing={0.5}>
                                                        <Typography variant="body2">
                                                            Active: <strong>{line.activeCount + draft}</strong> / {line.numEmployees}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Gap: {gap} {draft > 0 ? `(+${draft} selected)` : ''}
                                                        </Typography>
                                                    </Stack>
                                                </TableCell>

                                                <TableCell align="right">
                                                    <Button
                                                        disabled={isLineFull && draft === 0}
                                                        variant={draft > 0 ? "outlined" : "contained"}
                                                        size="small"
                                                        startIcon={checkingAvailability && currentEditingLine?.lineId === line.lineId ? <CircularProgress size={20}/> : <EditIcon/>}
                                                        onClick={() => openEmployeePicker(line)}
                                                    >
                                                        {draft > 0 ? "Edit" : "Fill Gap"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {/* WARNINGS */}
                        {!isGateOpen && (
                            <Alert severity="error" sx={{ mt: 3 }} icon={<WarningIcon />}>
                                <strong>Validation Failed:</strong>
                                <ul style={{ margin: '8px 0 0 20px' }}>
                                    {invalidLines.map(l => (
                                        <li key={l.lineId}>{l.lineName}: {getValidationStatus(l).msg}</li>
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
                                disabled={loading || !isGateOpen || !hasAllocation}
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
                // STRICT LIMIT: Cannot select more than the Gap
                requestedCount={
                    currentEditingLine
                        ? Math.max(0, currentEditingLine.numEmployees - currentEditingLine.activeCount)
                        : 0
                }
                targetLineId={currentEditingLine ? currentEditingLine.lineId : null}
                onSave={handleSaveAllocation}
            />

            {/* AUTO-FILL MODAL */}
            <Dialog open={autoFillModalOpen} onClose={() => setAutoFillModalOpen(false)}>
                <DialogTitle>Auto-Fill Gaps?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        This will automatically distribute available employees to fill the remaining gaps.
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