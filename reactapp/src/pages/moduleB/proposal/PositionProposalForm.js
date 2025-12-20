import
    {  Alert, Autocomplete, Box, Button, CircularProgress, Container,
        Divider, Grid, InputAdornment, Paper, TextField, Typography,
        createFilterOptions } from '@mui/material';
import { useEffect, useState } from 'react';
import WorkflowStepper from '../../../components/moduleB/WorkflowStepper';
import LineSelector from '../../../components/ModuleC/LineSelector';
import { getCurrentUser } from '../../../services/authService';
import { getAllDepartments } from '../../../services/departmentService';
import { createPositionChangeProposal } from '../../../services/moduleB/proposalService';
import { getAllRoles } from '../../../services/roleService';
import { getAllUsers, getUserById, getUsersByDepartment } from '../../../services/userService';
import ErrorPage from '../../ErrorPage';

function PositionProposalForm()
{
    const user = getCurrentUser();

    const isFactoryManager =
        user?.roleName === 'Factory Manager' ||
        user?.roleName === 'FManager';

    const [formData, setFormData] = useState({
        proposerId: user?.id || '',
        targetUser: null,
        newRole: null,
        newDepartment: null,
        newSalary: '',
        salaryType: '',
        reason: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Data state
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [loadingData, setLoadingData] = useState({
        users: false,
        roles: false,
        departments: false
    });

    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [loadingUserDetails, setLoadingUserDetails] = useState(false);

    // New line / sub line / work unit selection
    const [showNewLineSelector, setShowNewLineSelector] = useState(false);
    const [newLinePath, setNewLinePath] = useState([]);

    // Filter options for autocomplete
    const filter = createFilterOptions({
        matchFrom: 'any',
        ignoreCase: true,
        stringify: (option) => `${option.id} ${option.fullName || option.name}`,
    });

    // Load initial data
    useEffect(() =>
    {
        const loadData = async () =>
        {
            setLoadingData({ users: true, roles: true, departments: true });

            try
            {
                const [usersData, rolesData, departmentsData] = await Promise.all([
                    getAllUsers(),
                    getAllRoles(),
                    getAllDepartments()
                ]);

                setUsers(usersData || []);
                setRoles(rolesData || []);
                setDepartments(departmentsData || []);
            } catch (err)
            {
                console.error('Failed to load initial data:', err);
                setError('Failed to load required data. Please refresh the page.');
            } finally
            {
                setLoadingData({ users: false, roles: false, departments: false });
            }
        };

        loadData();
    }, []);

    useEffect(() =>
    {
        if (!selectedUserDetails) return;

        setFormData(prev => ({
            ...prev,
            newSalary: prev.newSalary === '' || prev.newSalary == null
                ? (selectedUserDetails.baseSalary ?? '')
                : prev.newSalary,
            salaryType: prev.salaryType === '' || prev.salaryType == null
                ? (selectedUserDetails.salaryType || '')
                : prev.salaryType
        }));
    }, [selectedUserDetails]);

    // Load full user details when target user changes (to show current info)
    useEffect(() =>
    {
        const loadDetails = async () =>
        {
            const targetId = formData.targetUser?.id;
            if (!targetId)
            {
                setSelectedUserDetails(null);
                return;
            }

            setLoadingUserDetails(true);
            try
            {
                const details = await getUserById(targetId);
                setSelectedUserDetails(details || null);
            } catch (err)
            {
                console.error('Failed to load user details:', err);
                setSelectedUserDetails(null);
            } finally
            {
                setLoadingUserDetails(false);
            }
        };

        loadDetails();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.targetUser?.id]);

    const handleDepartmentChange = async (_e, value) =>
    {
        setSelectedDepartment(value);
        // Reset selected employee when department changes
        setFormData((prev) => ({
            ...prev,
            targetUser: null
        }));

        // If a department is selected, load employees of that department
        if (value?.id)
        {
            setLoadingData((prev) => ({ ...prev, users: true }));
            try
            {
                const deptUsers = await getUsersByDepartment(value.id);
                setUsers(deptUsers || []);
            } catch (err)
            {
                console.error('Failed to load users for department:', err);
                setError('Failed to load employees for the selected department.');
                setUsers([]);
            } finally
            {
                setLoadingData((prev) => ({ ...prev, users: false }));
            }
        } else
        {
            // No department selected -> fall back to all users
            try
            {
                const allUsers = await getAllUsers();
                setUsers(allUsers || []);
            } catch (err)
            {
                console.error('Failed to reload all users:', err);
                setUsers([]);
            }
        }
    };

    if (!isFactoryManager)
    {
        return (
            <ErrorPage
                code={403}
                title="Access Forbidden"
                message="Only Factory Managers can create position change proposals."
            />
        );
    }

    const handleChange = (e) =>
    {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNumberKeyDown = (e) =>
    {
        if (
            [
                'Backspace',
                'Delete',
                'Tab',
                'Escape',
                'Enter',
                'ArrowLeft',
                'ArrowRight'
            ].includes(e.key)
        )
            return;
        if (!/[0-9]/.test(e.key))
        {
            e.preventDefault();
        }
    };

    // Helpers to extract current line hierarchy info from selected user
    const getLineChain = (user) =>
    {
        const chain = [];
        let node = user?.line || null;
        while (node)
        {
            chain.unshift(node);
            node = node.parent || null;
        }
        return chain;
    };

    const getCurrentDepartmentName = (user) =>
        user?.department?.name || user?.departmentName || '-';

    const getCurrentLineNames = (user) =>
    {
        const chain = getLineChain(user);
        const lineName = chain[0]?.name || '-';
        const workUnitName = chain.length > 0 ? chain[chain.length - 1]?.name : '-';
        const subLineName = chain.length >= 3 ? chain[chain.length - 2]?.name : '-';
        return { lineName, subLineName, workUnitName };
    };

    const { lineName: currentLineName, subLineName: currentSubLineName, workUnitName: currentWorkUnitName } =
        selectedUserDetails ? getCurrentLineNames(selectedUserDetails) : { lineName: '-', subLineName: '-', workUnitName: '-' };

    // Handle selecting new line/sub line/work unit via LineSelector
    const handleNewLineSelected = (lineNode, path = []) =>
    {
        if (!lineNode)
        {
            setNewLinePath([]);
            setShowNewLineSelector(false);
            return;
        }

        const chain = Array.isArray(path) ? path : [];
        setNewLinePath(chain);
        setShowNewLineSelector(false);
    };

    const getNewLineDisplays = () =>
    {
        if (!newLinePath || newLinePath.length === 0)
        {
            return { newLineName: '', newSubLineName: '', newWorkUnitName: '' };
        }
        const root = newLinePath[0];
        const leaf = newLinePath[newLinePath.length - 1];
        const sub = newLinePath.length >= 3 ? newLinePath[newLinePath.length - 2] : null;
        return {
            newLineName: root?.name || '',
            newSubLineName: sub?.name || '',
            newWorkUnitName: leaf?.name || ''
        };
    };

    const { newLineName, newSubLineName, newWorkUnitName } = getNewLineDisplays();

    // Fallback to selected user (list data) if detailed fetch hasn't returned yet
    const currentUserData = selectedUserDetails || formData.targetUser || {};
    const currentFullName = currentUserData.fullName || currentUserData.name || '…';
    const currentRoleName = (currentUserData.role?.name) || currentUserData.roleName || '…';
    const currentDepartmentName = getCurrentDepartmentName(currentUserData) || '…';
    const currentSalaryType = currentUserData.salaryType || currentUserData.salary_type || '…';
    const currentBaseSalary = currentUserData.baseSalary ?? currentUserData.base_salary ?? '…';

    const newDepartmentName = formData.newDepartment?.name || '-';
    const newRoleName = formData.newRole?.name || '-';

    const isFormValid =
        !!formData.targetUser &&
        !!formData.newRole &&
        !!formData.newDepartment &&
        !!formData.reason.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!formData.targetUser || !formData.newRole || !formData.newDepartment) {
            setError('Please select employee, new role and new department.');
            return;
        }

        if (!formData.reason.trim()) {
            setError('Please provide a reason for this position change.');
            return;
        }

        // Lấy line/sub-line/work unit mới nếu có
        const newLineId = newLinePath[0]?.id || null;
        const newSubLineId = newLinePath.length >= 3 ? newLinePath[newLinePath.length - 2]?.id : null;
        const newWorkUnitId = newLinePath.length > 0 ? newLinePath[newLinePath.length - 1]?.id : null;

        const payload = {
            proposerId: formData.proposerId,
            targetUserId: formData.targetUser.id,
            newRoleId: formData.newRole.id,
            newDepartmentId: formData.newDepartment.id,
            newSalary: formData.newSalary ? parseInt(formData.newSalary, 10) : null,
            salaryType: formData.salaryType || null,
            reason: formData.reason.trim(),
            lineId: newLineId,
            subLineId: newSubLineId,
            workUnitId: newWorkUnitId
        };

        setLoading(true);
        try {
            await createPositionChangeProposal(payload);
            setSuccess('Position change proposal created successfully.');
            setFormData((prev) => ({
                ...prev,
                targetUser: null,
                newRole: null,
                newDepartment: null,
                newSalary: '',
                reason: ''
            }));
            setNewLinePath([]);
        } catch (err) {
            console.error(err);
            const msg =
                err?.response?.data?.message ||
                err?.response?.data ||
                err?.message ||
                'Failed to create position change proposal.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };


    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary"
                    sx={{ mb: 2 }}
                >
                    Create Position Change Proposal
                </Typography>

                <WorkflowStepper status="pending" />

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {success}
                    </Alert>
                )}

                {loadingData.users || loadingData.roles || loadingData.departments ? (
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            minHeight: 120
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : (
                    <Box
                        component="form"
                        onSubmit={handleSubmit}
                        noValidate
                        sx={{
                            mt: 3,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                        }}
                    >
                        <Grid container spacing={3}>
                            {/* Khối 1: Chọn nhân viên */}
                            <Grid item xs={12}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        borderColor: 'grey.200',
                                        bgcolor: 'grey.50',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight="bold"
                                            color="primary"
                                        >
                                            1. Select Employee
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Select the employee whose position you want to change
                                        </Typography>
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Autocomplete
                                                options={departments}
                                                filterOptions={filter}
                                                getOptionLabel={(option) =>
                                                    option?.name
                                                        ? `${option.name} (ID: ${option.id})`
                                                        : ''
                                                }
                                                value={selectedDepartment}
                                                fullWidth
                                                onChange={handleDepartmentChange}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Current Department"
                                                        required
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Autocomplete
                                                options={users}
                                                filterOptions={filter}
                                                getOptionLabel={(option) =>
                                                    option?.fullName
                                                        ? `${option.fullName} (ID: ${option.id})`
                                                        : option?.name || ''
                                                }
                                                value={formData.targetUser}
                                                fullWidth
                                                onChange={(_e, value) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        targetUser: value
                                                    }))
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Employee to Change Position"
                                                        required
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        {selectedUserDetails && (
                                            <Grid item xs={12}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        mt: 0.5,
                                                        p: 2,
                                                        borderRadius: 2,
                                                        borderStyle: 'dashed',
                                                        borderColor: 'grey.300',
                                                        bgcolor: 'common.white',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight="bold"
                                                        gutterBottom
                                                    >
                                                        Current Position Information
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="body2">
                                                                <strong>Employee:</strong>{' '}
                                                                {selectedUserDetails.fullName} (ID:{' '}
                                                                {selectedUserDetails.id})
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Department:</strong>{' '}
                                                                {getCurrentDepartmentName(
                                                                    selectedUserDetails
                                                                )}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Position:</strong>{' '}
                                                                {selectedUserDetails.role?.name ||
                                                                    '-'}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="body2">
                                                                <strong>Line:</strong>{' '}
                                                                {currentLineName}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Sub-line:</strong>{' '}
                                                                {currentSubLineName}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Work Unit:</strong>{' '}
                                                                {currentWorkUnitName}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Base Salary:</strong>{' '}
                                                                {selectedUserDetails.baseSalary ??
                                                                    '-'}
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* Khối 2: Vị trí mới */}
                            <Grid item xs={12}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        borderColor: 'grey.200',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            mb: 2,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            fontWeight="bold"
                                            color="primary"
                                        >
                                            2. New Position Selection
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Select new position, department, and line structure
                                        </Typography>
                                    </Box>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <Autocomplete
                                                options={roles}
                                                filterOptions={filter}
                                                getOptionLabel={(option) =>
                                                    option?.name
                                                        ? `${option.name} (ID: ${option.id})`
                                                        : ''
                                                }
                                                value={formData.newRole}
                                                fullWidth
                                                onChange={(_e, value) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        newRole: value
                                                    }))
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="New Position"
                                                        required
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <Autocomplete
                                                options={departments}
                                                filterOptions={filter}
                                                getOptionLabel={(option) =>
                                                    option?.name
                                                        ? `${option.name} (ID: ${option.id})`
                                                        : ''
                                                }
                                                value={formData.newDepartment}
                                                fullWidth
                                                onChange={(_e, value) =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        newDepartment: value
                                                    }))
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="New Department"
                                                        required
                                                        size="small"
                                                    />
                                                )}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: 1.5,
                                                    mt: 0.5,
                                                }}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    disabled={!formData.newDepartment}
                                                    onClick={() =>
                                                        setShowNewLineSelector(
                                                            (prev) => !prev
                                                        )
                                                    }
                                                >
                                                    {showNewLineSelector
                                                        ? 'Close line selector'
                                                        : 'Select new line / sub-line / work unit'}
                                                </Button>

                                                {(newLineName ||
                                                    newSubLineName ||
                                                    newWorkUnitName) && (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            Selected:{' '}
                                                            <strong>
                                                                {newLineName || '-'} /{' '}
                                                                {newSubLineName || '-'} /{' '}
                                                                {newWorkUnitName || '-'}
                                                            </strong>
                                                        </Typography>
                                                    )}
                                            </Box>
                                        </Grid>

                                        {showNewLineSelector && formData.newDepartment && (
                                            <Grid item xs={12}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 1.5,
                                                        borderRadius: 2,
                                                        borderStyle: 'dashed',
                                                        borderColor: 'grey.300',
                                                        bgcolor: 'grey.50',
                                                    }}
                                                >
                                                    <LineSelector
                                                        departmentId={formData.newDepartment.id}
                                                        onLineSelected={
                                                            handleNewLineSelected
                                                        }
                                                    />
                                                </Paper>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* Khối 3: Chi tiết đề xuất */}
                            <Grid item xs={12}>
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2.5,
                                        borderRadius: 2,
                                        borderColor: 'grey.200',
                                    }}
                                >
                                    <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        color="primary"
                                        sx={{ mb: 2 }}
                                    >
                                        3. Details of Position Change Proposal
                                    </Typography>

                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="New Base Salary (optional)"
                                                name="newSalary"
                                                value={formData.newSalary}
                                                onChange={handleChange}
                                                onKeyDown={handleNumberKeyDown}
                                                fullWidth
                                                size="small"
                                                helperText="Leave blank to keep the current base salary"
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            VND
                                                        </InputAdornment>
                                                    )
                                                }}
                                            />
                                        </Grid>

                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                label="Salary Type"
                                                name="salaryType"
                                                value={formData.salaryType}
                                                onChange={handleChange}
                                                fullWidth
                                                size="small"
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <TextField
                                                label="Reason for Proposal"
                                                name="reason"
                                                value={formData.reason}
                                                onChange={handleChange}
                                                fullWidth
                                                size="small"
                                                multiline
                                                minRows={3}
                                                helperText="Explain the reason for the position change"
                                                required
                                            />
                                        </Grid>

                                        {formData.targetUser && (
                                            <Grid item xs={12}>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        mt: 0.5,
                                                        p: 2,
                                                        borderRadius: 2,
                                                        borderStyle: 'dashed',
                                                        borderColor: 'grey.300',
                                                        bgcolor: 'grey.50',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="subtitle2"
                                                        fontWeight="bold"
                                                        gutterBottom
                                                    >
                                                        Sumary
                                                    </Typography>
                                                    <Grid container spacing={1}>
                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="body2">
                                                                <strong>Employee Name:</strong>{' '}
                                                                {currentFullName}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Department:</strong>{' '}
                                                                {currentDepartmentName} →{' '}
                                                                {newDepartmentName}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                {currentRoleName} → {newRoleName}
                                                            </Typography>
                                                        </Grid>
                                                        <Grid item xs={12} sm={6}>
                                                            <Typography variant="body2">
                                                                <strong>Word Unit:</strong>{' '}
                                                                {selectedUserDetails
                                                                    ? currentWorkUnitName
                                                                    : '…'}{' '}
                                                                → {newWorkUnitName || '-'}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Salary type:</strong>{' '}
                                                                {formData.salaryType ||
                                                                    currentSalaryType}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                <strong>Base Salary:</strong>{' '}
                                                                {formData.newSalary ||
                                                                    currentBaseSalary}
                                                            </Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Paper>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Paper>
                            </Grid>

                            {/* submit */}
                            <Grid item xs={12}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'flex-end',
                                        mt: 1,
                                    }}
                                >
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={loading || !isFormValid}
                                    >
                                        {loading
                                            ? 'Sending...'
                                            : 'Create position change proposal'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {formData.targetUser && (
                    <Box sx={{ mt: 3 }}>
                        <Divider textAlign="left">Review Summary</Divider>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">Current</Typography>
                                    <Typography variant="body2">Employee: {selectedUserDetails ? selectedUserDetails.fullName : '…'}</Typography>
                                    <Typography variant="body2">Role: {selectedUserDetails ? (selectedUserDetails.role?.name || '-') : '…'}</Typography>
                                    <Typography variant="body2">Department: {selectedUserDetails ? getCurrentDepartmentName(selectedUserDetails) : '…'}</Typography>
                                    <Typography variant="body2">Line: {selectedUserDetails ? currentLineName : '…'}</Typography>
                                    <Typography variant="body2">Sub Line: {selectedUserDetails ? currentSubLineName : '…'}</Typography>
                                    <Typography variant="body2">Work Unit: {selectedUserDetails ? currentWorkUnitName : '…'}</Typography>
                                    <Typography variant="body2">Salary Type: {selectedUserDetails ? (selectedUserDetails.salaryType || '-') : '…'}</Typography>
                                    <Typography variant="body2">Base Salary: {selectedUserDetails ? (selectedUserDetails.baseSalary ?? '-') : '…'}</Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Paper variant="outlined" sx={{ p: 2 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">Proposed</Typography>
                                    <Typography variant="body2">Employee: {formData.targetUser?.fullName || formData.targetUser?.name || '-'}</Typography>
                                    <Typography variant="body2">Role: {newRoleName}</Typography>
                                    <Typography variant="body2">Department: {newDepartmentName}</Typography>
                                    <Typography variant="body2">Line: {newLineName || '-'}</Typography>
                                    <Typography variant="body2">Sub Line: {newSubLineName || '-'}</Typography>
                                    <Typography variant="body2">Work Unit: {newWorkUnitName || '-'}</Typography>
                                    <Typography variant="body2">Salary Type: {(selectedUserDetails && selectedUserDetails.salaryType) ? selectedUserDetails.salaryType : '-'}</Typography>
                                    <Typography variant="body2">Base Salary: {formData.newSalary || (selectedUserDetails ? (selectedUserDetails.baseSalary ?? '-') : '-')}</Typography>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}
export default PositionProposalForm;