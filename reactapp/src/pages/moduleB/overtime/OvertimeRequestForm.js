import React, {useState, useEffect} from 'react';
import {useNavigate} from "react-router-dom";
import {createOvertimeRequest} from '../../../services/moduleB/overtimeService';
import {getAllDepartments, getLinesByDepartment} from "../../../services/departmentService";
import {getCurrentUser} from "../../../services/authService";
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    Grid
} from '@mui/material';

const MAX_DAILY_OT_HOURS = 4.0;

const filter = createFilterOptions({
    matchFrom: 'any',
    ignoreCase: true,
    stringify: (option) => `${option.id} ${option.name}`,
});

function OvertimeRequestForm() {
    const navigate = useNavigate();
    const user = getCurrentUser();

    // Role Check
    const isFactoryManager = user?.roleName === 'Factory Manager' || user?.roleName === 'FManager';

    // --- 1. DEFINE ALL STATE HOOKS FIRST ---
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
    const [linesTableData, setLinesTableData] = useState([]);
    const [isSpecialDay, setIsSpecialDay] = useState(false);

    const [timeError, setTimeError] = useState(null);

    // --- 2. DEFINE ALL EFFECTS NEXT ---

    // Effect 1: Load Departments
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

    // Effect 2: Load Lines when Department changes
    useEffect(() => {
        if (!isFactoryManager) return;

        async function fetchLines() {
            if (formData.departmentId) {
                try {
                    const fetchedLines = await getLinesByDepartment(formData.departmentId);
                    const initialTableData = fetchedLines.map(line => ({
                        id: line.id,
                        name: line.name,
                        isSelected: false,
                        numEmployees: ''
                    }));
                    setLinesTableData(initialTableData);
                } catch (err) {
                    console.error(err);
                    setLinesTableData([]);
                }
            } else {
                setLinesTableData([]);
            }
        }

        fetchLines();
    }, [formData.departmentId, isFactoryManager]);

    // Effect 3: Calculate Time & Check Special Day
    useEffect(() => {
        // Check if Date is Sunday (0)
        if (formData.overtimeDate) {
            const dayOfWeek = new Date(formData.overtimeDate).getDay();
            const isSunday = dayOfWeek === 0;
            setIsSpecialDay(isSunday);

            // Reset to 17:00 if not special day
            if (!isSunday && formData.startTime !== '17:00') {
                setFormData(prev => ({...prev, startTime: '17:00'}));
            }
        }

        if (formData.startTime && formData.endTime) {
            const start = new Date(`1970-01-01T${formData.startTime}:00`);
            const end = new Date(`1970-01-01T${formData.endTime}:00`);

            const diffMs = end - start;

            if (diffMs <= 0) {
                setFormData(prev => ({...prev, overtimeTime: 0}));
                setTimeError("End time must be after Start time.");
            } else {
                const diffHours = diffMs / (1000 * 60 * 60);
                const roundedHours = Math.round(diffHours * 100) / 100;

                setFormData(prev => ({...prev, overtimeTime: roundedHours}));

                // --- CONSTRAINT CHECK ---
                if (roundedHours > MAX_DAILY_OT_HOURS) {
                    setTimeError(`Duration (${roundedHours}h) exceeds the maximum allowed limit of ${MAX_DAILY_OT_HOURS} hours.`);
                } else {
                    setTimeError(null);
                }
            }
        }
    }, [formData.overtimeDate, formData.startTime, formData.endTime]);


    // --- 3. HANDLERS ---

    const handleMainChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleLineCheckbox = (index) => {
        const newData = [...linesTableData];
        newData[index].isSelected = !newData[index].isSelected;
        if (!newData[index].isSelected) newData[index].numEmployees = '';
        setLinesTableData(newData);
    };

    const handleLineQuantity = (index, value) => {
        const newData = [...linesTableData];
        newData[index].numEmployees = value;
        if (value && !newData[index].isSelected) newData[index].isSelected = true;
        setLinesTableData(newData);
    };

    const handleSelectAll = (event) => {
        const isChecked = event.target.checked;
        const newData = linesTableData.map(row => ({...row, isSelected: isChecked}));
        setLinesTableData(newData);
    };

    const totalEmployees = linesTableData
        .filter(l => l.isSelected)
        .reduce((sum, item) => sum + (parseInt(item.numEmployees) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        const selectedLines = linesTableData.filter(l => l.isSelected);

        if (selectedLines.length === 0) {
            setError("Please select at least one line.");
            setLoading(false);
            return;
        }
        if (selectedLines.some(l => !l.numEmployees || parseInt(l.numEmployees) <= 0)) {
            setError("All selected lines must have a valid number of employees.");
            setLoading(false);
            return;
        }

        const payload = {
            factoryManagerId: parseInt(formData.factoryManagerId),
            departmentId: parseInt(formData.departmentId),
            overtimeDate: formData.overtimeDate,
            startTime: formData.startTime + ":00",
            endTime: formData.endTime + ":00",
            overtimeTime: parseFloat(formData.overtimeTime),
            details: formData.details,
            lineDetails: selectedLines.map(l => ({
                lineId: l.id,
                numEmployees: parseInt(l.numEmployees)
            }))
        };

        try {
            await createOvertimeRequest(payload);
            alert(`Successfully created request for ${totalEmployees} employees!`);
            navigate("/overtime-request");
        } catch (err) {
            setError(err.toString() || 'An unknown error occurred.');
        } finally {
            setLoading(false);
        }
    };

    // --- 4. CONDITIONAL RENDER (ACCESS CONTROL) ---
    if (!isFactoryManager) {
        return (
            <ErrorPage
                code={403}
                title="Access Restricted"
                message="Only Factory Managers can create overtime requests."
            />
        );
    }

    // --- 5. MAIN RENDER ---
    return (
        <Container maxWidth="md">
            <Paper elevation={3} sx={{p: 4, mt: 4, borderRadius: 2}}>
                <Typography variant="h5" component="h1" gutterBottom color="primary" fontWeight="bold">
                    Create Overtime Request
                </Typography>

                <Box component="form" onSubmit={handleSubmit}
                     sx={{mt: 2, display: 'flex', flexDirection: 'column', gap: 3}}>

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
                                <TextField {...params} label="Department" required error={!departments.length}/>
                            )}
                        />
                    </Box>

                    {/* --- ROW 2: Date & Time --- */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <TextField
                                label="Date"
                                name="overtimeDate"
                                type="date"
                                value={formData.overtimeDate}
                                onChange={handleMainChange}
                                required
                                fullWidth
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="From"
                                name="startTime"
                                type="time"
                                value={formData.startTime}
                                onChange={handleMainChange}
                                required
                                fullWidth
                                disabled={!isSpecialDay}
                                InputLabelProps={{shrink: true}}
                                helperText={!isSpecialDay ? "Fixed (Mon-Sat)" : "Editable (Sunday)"}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                label="To"
                                name="endTime"
                                type="time"
                                value={formData.endTime}
                                onChange={handleMainChange}
                                required
                                fullWidth
                                InputLabelProps={{shrink: true}}
                            />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                            <TextField
                                label="Hours"
                                value={formData.overtimeTime}
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

                    {/* --- NEW WARNING ALERT --- */}
                    {timeError && (
                        <Alert severity="error" sx={{mt: -2}}>
                            {timeError}
                        </Alert>
                    )}

                    <Typography variant="h6" sx={{mt: 1}}>
                        Select Lines & Headcount
                    </Typography>

                    {linesTableData.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined" sx={{maxHeight: 400}}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                indeterminate={linesTableData.some(l => l.isSelected) && !linesTableData.every(l => l.isSelected)}
                                                checked={linesTableData.length > 0 && linesTableData.every(l => l.isSelected)}
                                                onChange={handleSelectAll}
                                            />
                                        </TableCell>
                                        <TableCell><strong>Line Name</strong></TableCell>
                                        <TableCell width="30%"><strong>Count</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {linesTableData.map((row, index) => (
                                        <TableRow key={row.id} selected={row.isSelected} hover>
                                            <TableCell padding="checkbox">
                                                <Checkbox
                                                    checked={row.isSelected}
                                                    onChange={() => handleLineCheckbox(index)}
                                                />
                                            </TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>
                                                <TextField
                                                    size="small"
                                                    placeholder="0"
                                                    type="number"
                                                    value={row.numEmployees}
                                                    onChange={(e) => handleLineQuantity(index, e.target.value)}
                                                    disabled={!row.isSelected}
                                                    inputProps={{min: "1"}}
                                                    fullWidth
                                                    error={row.isSelected && (!row.numEmployees || row.numEmployees <= 0)}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Alert severity="info">Select a department to view available lines.</Alert>
                    )}

                    <Box display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                        <Typography variant="h6">
                            Total Employees: <strong>{totalEmployees}</strong>
                        </Typography>
                    </Box>

                    <TextField
                        label="Reason / Details"
                        name="details"
                        value={formData.details}
                        onChange={handleMainChange}
                        multiline
                        rows={3}
                        fullWidth
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                    {success && <Alert severity="success">{success}</Alert>}

                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || totalEmployees === 0 || !!timeError}
                        sx={{py: 1.5, fontWeight: 'bold'}}
                    >
                        {loading ? <CircularProgress size={26}/> : 'Submit Overtime Request'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default OvertimeRequestForm;