import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { createOvertimeRequest } from '../../../services/moduleB/overtimeService';
import { getAllDepartments, getLinesByDepartment } from "../../../services/departmentService";
import { getCurrentUser } from "../../../services/authService";
import ErrorPage from '../../ErrorPage';

import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Autocomplete,
    createFilterOptions,
    Paper,
    Checkbox,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Tooltip,
    Divider,
    MenuItem
} from '@mui/material';

const MAX_DAILY_OT_HOURS = 4.0;

const filter = createFilterOptions({
    matchFrom: 'any',
    ignoreCase: true,
    stringify: (option) => `${option.id} ${option.name}`,
});

// --- TIME UTILS ---
const generateTimeSlots = () => {
    const slots = [];
    for (let i = 0; i < 24; i++) {
        const h = i.toString().padStart(2, '0');
        slots.push(`${h}:00`, `${h}:30`);
    }
    return slots;
};

const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

function OvertimeRequestForm() {
    const navigate = useNavigate();
    const user = getCurrentUser();
    const timeSlots = useMemo(() => generateTimeSlots(), []);

    // Role Check
    const isFactoryManager = user?.roleName === 'Factory Manager' || user?.roleName === 'FManager';

    // --- STATE ---
    const [formData, setFormData] = useState({
        factoryManagerId: user?.id || '',
        departmentId: '',
        overtimeDate: new Date().toISOString().split('T')[0],
        startTime: '17:00',
        endTime: '18:00',
        overtimeTime: 1.0,
        details: ''
    });

    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Hierarchy Data
    const [allLines, setAllLines] = useState([]);
    const [childLines, setChildLines] = useState([]);

    // Selection State
    const [selectedSections, setSelectedSections] = useState({});
    const [grandchildQuotas, setGrandchildQuotas] = useState({});

    const [isSpecialDay, setIsSpecialDay] = useState(false);
    const [timeError, setTimeError] = useState(null);
    const [displayDuration, setDisplayDuration] = useState("1h 0m");

    // --- EFFECTS ---

    useEffect(() => {
        if (!isFactoryManager) return;
        async function loadData() {
            try {
                const data = await getAllDepartments();
                setDepartments(data || []);
            } catch (err) {
                setError("Failed to fetch departments.");
            }
        }
        loadData();
    }, [isFactoryManager]);

    useEffect(() => {
        if (!isFactoryManager) return;
        async function fetchLines() {
            if (formData.departmentId) {
                try {
                    const fetchedLines = await getLinesByDepartment(formData.departmentId);
                    setAllLines(fetchedLines || []);
                    // Filter for "Leader Lines" (Level 4)
                    const sections = (fetchedLines || []).filter(l => l.level === 4);
                    setChildLines(sections);

                    setSelectedSections({});
                    setGrandchildQuotas({});
                } catch (err) {
                    console.error(err);
                    setAllLines([]);
                    setChildLines([]);
                }
            } else {
                setAllLines([]);
                setChildLines([]);
            }
        }
        fetchLines();
    }, [formData.departmentId, isFactoryManager]);

    // Time Logic
    useEffect(() => {
        if (formData.overtimeDate) {
            const dayOfWeek = new Date(formData.overtimeDate).getDay();
            const isSunday = dayOfWeek === 0;
            setIsSpecialDay(isSunday);

            if (!isSunday && formData.startTime !== '17:00') {
                setFormData(prev => ({...prev, startTime: '17:00'}));
            }
        }

        const startMins = timeToMinutes(formData.startTime);
        const endMins = timeToMinutes(formData.endTime);
        const diffMins = endMins - startMins;

        if (diffMins <= 0) {
            setFormData(prev => ({...prev, overtimeTime: 0}));
            setDisplayDuration("Invalid");
            if (formData.endTime) setTimeError("End time must be after Start time.");
            else setTimeError(null);
        } else {
            const diffHoursDecimal = diffMins / 60.0;
            const h = Math.floor(diffMins / 60);
            const m = diffMins % 60;

            setFormData(prev => ({...prev, overtimeTime: diffHoursDecimal}));
            setDisplayDuration(`${h}h ${m}m`);

            if (diffHoursDecimal > MAX_DAILY_OT_HOURS) {
                setTimeError(`Exceeds limit of ${MAX_DAILY_OT_HOURS} hours.`);
            } else {
                setTimeError(null);
            }
        }
    }, [formData.overtimeDate, formData.startTime, formData.endTime]);

    // --- HELPERS ---

    const getManagerName = (childLine) => {
        if (!childLine.parentId) return "Unassigned";
        const parent = allLines.find(l => l.id === childLine.parentId);
        return parent ? parent.managerName : "Unknown";
    };

    const getGrandchildren = (childId) => {
        return allLines.filter(l => l.parentId === childId);
    };

    const getTotalEmployees = () => {
        return Object.values(grandchildQuotas).reduce((sum, val) => sum + val, 0);
    };

    const getCurrentDepartmentCap = () => {
        const dept = departments.find(d => d.id === formData.departmentId);
        return dept ? (dept.numberOfEmployees || 0) : 0;
    };

    // Filter Logic: Returns ONLY valid times for the list
    const getValidEndTimes = () => {
        const sMins = timeToMinutes(formData.startTime);
        return timeSlots.filter(t => {
            const eMins = timeToMinutes(t);
            const diff = eMins - sMins;
            return diff > 0 && diff <= (MAX_DAILY_OT_HOURS * 60);
        });
    };

    // --- HANDLERS ---

    const handleMainChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSectionToggle = (sectionId) => {
        setSelectedSections(prev => {
            const isNowSelected = !prev[sectionId];
            if (!isNowSelected) {
                // If unchecking, clear quotas for children
                const children = getGrandchildren(sectionId);
                setGrandchildQuotas(currentQuotas => {
                    const newQuotas = { ...currentQuotas };
                    children.forEach(child => {
                        delete newQuotas[child.id];
                    });
                    return newQuotas;
                });
            }
            return { ...prev, [sectionId]: isNowSelected };
        });
    };

    const handleQuotaChange = (lineId, val) => {
        if (val === '') {
            setGrandchildQuotas(prev => {
                const newQ = { ...prev };
                delete newQ[lineId];
                return newQ;
            });
            return;
        }
        const intVal = parseInt(val);
        setGrandchildQuotas(prev => ({
            ...prev,
            [lineId]: isNaN(intVal) ? 0 : intVal
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validation
        if (!formData.departmentId) {
            setError("Please select a Department.");
            setLoading(false);
            return;
        }
        if (timeError || formData.overtimeTime <= 0) {
            setError("Please fix time errors.");
            setLoading(false);
            return;
        }

        const activeSectionIds = Object.keys(selectedSections).filter(id => selectedSections[id]).map(Number);

        if (activeSectionIds.length === 0) {
            setError("Please select at least one Section.");
            setLoading(false);
            return;
        }

        const lineDetails = [];
        let missingWorkersError = false;

        for (const secId of activeSectionIds) {
            const grandchildren = getGrandchildren(secId);
            if (grandchildren.length === 0) continue;

            for (const gc of grandchildren) {
                const count = grandchildQuotas[gc.id];
                if (!count || count <= 0) {
                    missingWorkersError = true;
                    break;
                }
                // FIX: Structure matching DetailDTO (flat fields)
                lineDetails.push({
                    lineId: gc.id,
                    numEmployees: count
                });
            }
            if (missingWorkersError) break;
        }

        if (missingWorkersError) {
            setError("Every line within a selected section must have at least 1 worker assigned.");
            setLoading(false);
            return;
        }

        const totalReq = getTotalEmployees();
        const deptCap = getCurrentDepartmentCap();
        if (deptCap > 0 && totalReq > deptCap) {
            setError(`Request exceeds department capacity! (Requested: ${totalReq}, Available: ${deptCap})`);
            setLoading(false);
            return;
        }

        // FIX: Payload matching RequestDTO (flat fields)
        const payload = {
            factoryManagerId: parseInt(formData.factoryManagerId),
            departmentId: parseInt(formData.departmentId),
            overtimeDate: formData.overtimeDate,
            startTime: `${formData.overtimeDate}T${formData.startTime}:00`,
            endTime: `${formData.overtimeDate}T${formData.endTime}:00`,
            overtimeTime: parseFloat(formData.overtimeTime),
            details: formData.details,
            lineDetails: lineDetails
        };

        try {
            await createOvertimeRequest(payload);
            setSuccess(`Successfully created request for ${totalReq} employees!`);
            alert(`Success!`);
            // FIX: Correct navigation path from App.js
            navigate("/overtime-request");
        } catch (err) {
            console.error("Submit Error:", err);
            let errMsg = "An unknown error occurred.";
            if (err.response && err.response.data) {
                errMsg = typeof err.response.data === 'string'
                    ? err.response.data
                    : (err.response.data.message || JSON.stringify(err.response.data));
            } else if (err.message) {
                errMsg = err.message;
            }
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (!isFactoryManager) {
        return (
            <ErrorPage
                code={403}
                title="Access Restricted"
                message="Only Factory Managers can create overtime requests."
            />
        );
    }

    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{p: 4, mt: 4, borderRadius: 2}}>
                <Typography variant="h5" component="h1" gutterBottom color="primary" fontWeight="bold">
                    Create Overtime Request
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 3}}>

                    {/* --- GENERAL INFO (Repo Layout) --- */}
                    <Box sx={{display: 'flex', gap: 2, flexWrap: 'wrap'}}>
                        <TextField
                            label="Factory Manager ID"
                            name="factoryManagerId"
                            value={formData.factoryManagerId}
                            disabled
                            InputProps={{readOnly: true}}
                            sx={{flex: 1, bgcolor: '#f5f5f5'}}
                        />
                        <Autocomplete
                            id="department-select"
                            options={departments}
                            getOptionLabel={(option) => `${option.name} (${option.id})`}
                            filterOptions={filter}
                            value={departments.find(dept => dept.id === formData.departmentId) || null}
                            onChange={(event, newValue) => {
                                setFormData(prev => ({...prev, departmentId: newValue ? newValue.id : ''}));
                            }}
                            sx={{flex: 2}}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Department"
                                    // Removed 'required' attribute
                                    error={!departments.length && !loading}
                                />
                            )}
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Date"
                                name="overtimeDate"
                                type="date"
                                value={formData.overtimeDate}
                                onChange={handleMainChange}
                                fullWidth
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>

                        {/* Start Time Select */}
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select
                                label="From"
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleMainChange}
                                fullWidth
                                disabled={!isSpecialDay}
                                helperText={!isSpecialDay ? "Fixed (17:00)" : ""}
                            >
                                {timeSlots.map((t) => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* End Time Select (Filtered) */}
                        <Grid item xs={12} sm={3}>
                            <TextField
                                select
                                label="To"
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleMainChange}
                                fullWidth
                                error={!!timeError}
                            >
                                {/* Only show valid options */}
                                {getValidEndTimes().map((t) => (
                                    <MenuItem key={t} value={t}>{t}</MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        <Grid item xs={12} sm={2}>
                            <TextField
                                label="Hours"
                                value={displayDuration}
                                fullWidth
                                disabled
                                error={!!timeError}
                                sx={{
                                    "& .MuiInputBase-input.Mui-disabled": {
                                        WebkitTextFillColor: !!timeError ? "red" : "#000000",
                                        backgroundColor: "#f5f5f5"
                                    }
                                }}
                            />
                        </Grid>
                    </Grid>

                    {timeError && (
                        <Alert severity="error" sx={{mt: -2}}>
                            {timeError}
                        </Alert>
                    )}

                    <TextField
                        label="Reason / Details"
                        name="details"
                        value={formData.details}
                        onChange={handleMainChange}
                        multiline
                        rows={3}
                        fullWidth
                    />

                    <Divider sx={{ my: 1 }} />

                    {/* --- HIERARCHY SELECTOR (CSS Grid - 2 Cols) --- */}
                    <Typography variant="h6" sx={{mt: 1}}>
                        Assign Workers to Lines
                    </Typography>

                    {childLines.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {childLines.map((child) => {
                                const isSelected = !!selectedSections[child.id];
                                const managerName = getManagerName(child);
                                const grandchildren = getGrandchildren(child.id);

                                return (
                                    <Accordion
                                        key={child.id}
                                        expanded={isSelected}
                                        onChange={() => handleSectionToggle(child.id)}
                                        sx={{
                                            border: isSelected ? '1px solid #1976d2' : '1px solid #e0e0e0',
                                            boxShadow: 'none',
                                            '&:before': { display: 'none' }
                                        }}
                                    >
                                        <AccordionSummary sx={{ bgcolor: isSelected ? '#e3f2fd' : 'white', minHeight: 48 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onChange={() => handleSectionToggle(child.id)}
                                                    />
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {child.name}
                                                    </Typography>
                                                </Box>
                                                <Chip
                                                    label={`Manager: ${managerName}`}
                                                    size="small"
                                                    variant="outlined"
                                                    color={isSelected ? "primary" : "default"}
                                                />
                                            </Box>
                                        </AccordionSummary>

                                        <AccordionDetails sx={{ bgcolor: '#fafafa', p: 2 }}>
                                            {/* CSS GRID: STRICT 2 COLUMNS */}
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 2
                                            }}>
                                                {grandchildren.map(gc => (
                                                    <Box
                                                        key={gc.id}
                                                        sx={{
                                                            p: 1.5,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            bgcolor: 'white',
                                                            border: '1px solid #e0e0e0',
                                                            borderRadius: 1
                                                        }}
                                                    >
                                                        <Tooltip title={gc.name} placement="top">
                                                            <Typography variant="body2" noWrap sx={{ maxWidth: '70%', fontWeight: 500 }}>
                                                                {gc.name}
                                                            </Typography>
                                                        </Tooltip>

                                                        {/* Simple Integer Input - No complex key handlers */}
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            placeholder="0"
                                                            value={grandchildQuotas[gc.id] || ''}
                                                            onChange={(e) => handleQuotaChange(gc.id, e.target.value)}
                                                            inputProps={{ min: 1, style: { textAlign: 'center', padding: '4px' } }}
                                                            sx={{ width: '80px' }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>

                                            {grandchildren.length === 0 && (
                                                <Typography variant="caption" color="error">No lines found here.</Typography>
                                            )}
                                        </AccordionDetails>
                                    </Accordion>
                                );
                            })}
                        </Box>
                    ) : (
                        <Alert severity="info">
                            {formData.departmentId ? "No sections found for this department." : "Select a department to view sections."}
                        </Alert>
                    )}

                    {/* --- FOOTER --- */}
                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} sx={{ mt: 2 }}>
                        <Typography variant="h6">
                            Total Employees: <strong>{getTotalEmployees()}</strong>
                        </Typography>
                    </Box>

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || getTotalEmployees() === 0 || !!timeError}
                        sx={{py: 1.5, fontWeight: 'bold'}}
                    >
                        {loading ? <CircularProgress size={26} color="inherit"/> : 'Submit Overtime Request'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default OvertimeRequestForm;