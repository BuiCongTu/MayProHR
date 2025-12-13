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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText
} from '@mui/material';
import WorkflowStepper from "../../../components/moduleB/WorkflowStepper";

const MAX_DAILY_OT_HOURS = 4.0;

const filter = createFilterOptions({
    matchFrom: 'any',
    ignoreCase: true,
    stringify: (option) => `${option.id} ${option.name}`,
});

// --- UTILS ---
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

const getDefaultDate = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (currentHour > 17 || (currentHour === 17 && currentMinute > 0)) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    return now.toISOString().split('T')[0];
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
        overtimeDate: getDefaultDate(),
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
    const [selectedGrandchildren, setSelectedGrandchildren] = useState({});
    const [grandchildQuotas, setGrandchildQuotas] = useState({});

    const [isSpecialDay, setIsSpecialDay] = useState(false);
    const [timeError, setTimeError] = useState(null);
    const [displayDuration, setDisplayDuration] = useState("1h 0m");
    const [capacityError, setCapacityError] = useState(false);

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
                    const sections = (fetchedLines || []).filter(l => l.level === 4);
                    setChildLines(sections);

                    setSelectedSections({});
                    setSelectedGrandchildren({});
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
        return Object.entries(grandchildQuotas)
            .filter(([id, val]) => selectedGrandchildren[id]) // Only count selected
            .reduce((sum, [id, val]) => sum + val, 0);
    };

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

    // Level 4 Toggle: Selects/Deselects ALL children + Auto-fills Max Capacity
    const handleSectionToggle = (sectionId) => {
        const grandchildren = getGrandchildren(sectionId);

        setSelectedSections(prev => {
            const isNowSelected = !prev[sectionId];

            if (isNowSelected) {
                // AUTO-SELECT ALL GRANDCHILDREN & SET MAX QUOTA
                setSelectedGrandchildren(prevGC => {
                    const newGC = { ...prevGC };
                    grandchildren.forEach(gc => newGC[gc.id] = true);
                    return newGC;
                });
                setGrandchildQuotas(prevQ => {
                    const newQ = { ...prevQ };
                    grandchildren.forEach(gc => newQ[gc.id] = gc.totalEmployees || 0);
                    return newQ;
                });
            } else {
                // CLEAR ALL GRANDCHILDREN
                setSelectedGrandchildren(prevGC => {
                    const newGC = { ...prevGC };
                    grandchildren.forEach(gc => delete newGC[gc.id]);
                    return newGC;
                });
                setGrandchildQuotas(prevQ => {
                    const newQ = { ...prevQ };
                    grandchildren.forEach(gc => delete newQ[gc.id]);
                    return newQ;
                });
            }
            return { ...prev, [sectionId]: isNowSelected };
        });
    };

    // Level 5 Toggle: Granular check
    const handleGrandchildToggle = (lineId, maxCap) => {
        setSelectedGrandchildren(prev => {
            const isNowSelected = !prev[lineId];

            setGrandchildQuotas(prevQ => {
                const newQ = { ...prevQ };
                if (isNowSelected) {
                    newQ[lineId] = maxCap || 0; // Default to MAX
                } else {
                    delete newQ[lineId];
                }
                return newQ;
            });

            return { ...prev, [lineId]: isNowSelected };
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

    // Check if any line quota exceeds its capacity
    useEffect(() => {
        let hasError = false;
        for (const [lineIdStr, qty] of Object.entries(grandchildQuotas)) {
            if (!selectedGrandchildren[lineIdStr]) continue; // Skip unchecked
            const lineId = parseInt(lineIdStr);
            const lineObj = allLines.find(l => l.id === lineId);
            if (lineObj && qty > lineObj.totalEmployees) {
                hasError = true;
                break;
            }
        }
        setCapacityError(hasError);
    }, [grandchildQuotas, allLines, selectedGrandchildren]);

    const handleNumberKeyDown = (e) => {
        if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        if (!/[0-9]/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

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
        if (capacityError) {
            setError("One or more lines exceed their employee capacity. Please fix the red fields.");
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

            // Validation: Must have at least 1 checked grandchild in this section
            const checkedChildren = grandchildren.filter(gc => selectedGrandchildren[gc.id]);
            if (checkedChildren.length === 0) {
                missingWorkersError = true;
                setError(`Section "${allLines.find(l=>l.id===secId)?.name}" must have at least one worker line selected.`);
                break;
            }

            for (const gc of checkedChildren) {
                const count = grandchildQuotas[gc.id];
                if (!count || count <= 0) {
                    missingWorkersError = true;
                    setError(`Selected line "${gc.name}" must have at least 1 employee.`);
                    break;
                }

                lineDetails.push({
                    lineId: gc.id,
                    numEmployees: count
                });
            }
            if (missingWorkersError) break;
        }

        if (missingWorkersError) {
            setLoading(false);
            return;
        }

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
            const totalReq = getTotalEmployees();
            setSuccess(`Successfully created request for ${totalReq} employees!`);
            alert(`Success!`);
            navigate("/overtime-request");
        } catch (err) {
            console.error(err);
            setError(err);
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

                <Box sx={{ mb: 3 }}>
                    <WorkflowStepper status="draft" />
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Typography variant="h5" component="h1" gutterBottom color="primary" fontWeight="bold">
                    Create Overtime Request
                </Typography>

                <Box component="form" onSubmit={handleSubmit} sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 3}}>

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
                                    error={!departments.length && !loading}
                                />
                            )}
                        />
                    </Box>

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
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

                        <Grid item xs={12} sm={3}>
                            <FormControl fullWidth disabled={!isSpecialDay}>
                                <InputLabel>From</InputLabel>
                                <Select
                                    label="From"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleMainChange}
                                >
                                    {timeSlots.map((t) => (
                                        <MenuItem key={t} value={t}>{t}</MenuItem>
                                    ))}
                                </Select>
                                {!isSpecialDay && <FormHelperText>Fixed (17:00)</FormHelperText>}
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth error={!!timeError}>
                                <InputLabel>To</InputLabel>
                                <Select
                                    label="To"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleMainChange}
                                >
                                    {getValidEndTimes().map((t) => (
                                        <MenuItem key={t} value={t}>{t}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
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

                    {timeError && <Alert severity="error" sx={{mt: -2}}>{timeError}</Alert>}

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

                    <Typography variant="h6" sx={{mt: 1}}>
                        Select Lines & Workers
                    </Typography>

                    {childLines.length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            {childLines.map((child) => {
                                const isSectionSelected = !!selectedSections[child.id];
                                const managerName = getManagerName(child);
                                const grandchildren = getGrandchildren(child.id);

                                return (
                                    <Accordion
                                        key={child.id}
                                        expanded={isSectionSelected}
                                        onChange={() => handleSectionToggle(child.id)}
                                        sx={{
                                            border: isSectionSelected ? '1px solid #1976d2' : '1px solid #e0e0e0',
                                            boxShadow: 'none',
                                            '&:before': { display: 'none' }
                                        }}
                                    >
                                        <AccordionSummary sx={{ bgcolor: isSectionSelected ? '#e3f2fd' : 'white', minHeight: 48 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Checkbox
                                                        checked={isSectionSelected}
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
                                                    color={isSectionSelected ? "primary" : "default"}
                                                />
                                            </Box>
                                        </AccordionSummary>

                                        <AccordionDetails sx={{ bgcolor: '#fafafa', p: 2 }}>
                                            <Box sx={{
                                                display: 'grid',
                                                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                                                gap: 2
                                            }}>
                                                {grandchildren.map(gc => {
                                                    const isGcSelected = !!selectedGrandchildren[gc.id];
                                                    const currentVal = grandchildQuotas[gc.id] || 0;
                                                    const maxCap = gc.totalEmployees || 0;
                                                    const isOverCap = currentVal > maxCap;

                                                    return (
                                                        <Box
                                                            key={gc.id}
                                                            sx={{
                                                                p: 1.5,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                bgcolor: isGcSelected ? 'white' : '#f0f0f0',
                                                                border: isOverCap ? '1px solid red' : (isGcSelected ? '1px solid #90caf9' : '1px solid #e0e0e0'),
                                                                borderRadius: 1,
                                                                opacity: isGcSelected ? 1 : 0.7
                                                            }}
                                                        >
                                                            <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '65%' }}>
                                                                <Checkbox
                                                                    size="small"
                                                                    checked={isGcSelected}
                                                                    onChange={() => handleGrandchildToggle(gc.id, maxCap)}
                                                                />
                                                                <Box>
                                                                    <Tooltip title={gc.name} placement="top">
                                                                        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                                                                            {gc.name}
                                                                        </Typography>
                                                                    </Tooltip>
                                                                    <Typography variant="caption" color={isOverCap ? "error" : "text.secondary"}>
                                                                        Capacity: {maxCap}
                                                                    </Typography>
                                                                </Box>
                                                            </Box>

                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                placeholder="0"
                                                                disabled={!isGcSelected}
                                                                value={isGcSelected ? (grandchildQuotas[gc.id] || '') : ''}
                                                                onChange={(e) => handleQuotaChange(gc.id, e.target.value)}
                                                                onKeyDown={handleNumberKeyDown}
                                                                inputProps={{ min: 1, style: { textAlign: 'center', padding: '4px' } }}
                                                                sx={{ width: '70px', bgcolor: isGcSelected ? 'white' : '#eee' }}
                                                                error={isOverCap}
                                                            />
                                                        </Box>
                                                    );
                                                })}
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

                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2} sx={{ mt: 2 }}>
                        <Typography variant="h6">
                            Total Employees: <strong>{getTotalEmployees()}</strong>
                        </Typography>
                    </Box>

                    {capacityError && <Alert severity="error">Cannot submit: Some lines exceed their employee limit.</Alert>}

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || getTotalEmployees() === 0 || !!timeError || capacityError}
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