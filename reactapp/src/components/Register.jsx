import
    {
        Alert,
        Box,
        Button,
        CircularProgress,
        Container,
        Dialog,
        DialogActions,
        DialogContent,
        DialogTitle,
        MenuItem,
        Paper,
        Table,
        TableBody,
        TableCell,
        TableContainer,
        TableHead,
        TableRow,
        TextField,
        Typography
    } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authService from '../services/authService';
import * as formDataService from '../services/formDataService';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        roleId: '',
        departmentId: '',
        parentLineId: '',
        lineId: '',
        subLineId: '',
        wordUnitId: '',
        skillLevelId: '',
        gender: '',
        salaryType: 'TimeBased',
        baseSalary: '',
        hireDate: '',
        verificationMethod: 'EMAIL'
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [departments, setDepartments] = useState([]);
    const [roles, setRoles] = useState([]);
    const [filteredRoles, setFilteredRoles] = useState([]);
    const [parentLines, setParentLines] = useState([]);
    const [childLines, setChildLines] = useState([]);
    const [subLines, setSubLines] = useState([]);
    const [wordUnits, setWordUnits] = useState([]);
    const [skillLevels, setSkillLevels] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [existingUsers, setExistingUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [duplicateUser, setDuplicateUser] = useState(null);
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);

    useEffect(() => {
        loadFormOptions();
    }, []);

    useEffect(() => {
        if (currentUser && roles.length > 0) {
            filterAvailableRoles(currentUser.roleName, roles);
        }
    }, [currentUser, roles]);

    const loadFormOptions = async () => {
        try {
            const user = authService.getCurrentUser();
            if (user) {
                setCurrentUser(user);
            }

            const [depts, rolesList, skillLevelsList] = await Promise.all([
                formDataService.getDepartments(),
                formDataService.getRoles(),
                formDataService.getSkillLevels()
            ]);
            setDepartments(depts || []);
            setRoles(rolesList || []);
            setSkillLevels(skillLevelsList || []);
        } catch (err) {
            console.error('Failed to load form options:', err);
            setError('Failed to load form options');
        }
    };

    const filterAvailableRoles = (currentUserRole, allRoles) => {
        let availableRoleNames = [];

        if (currentUserRole === 'Admin') {
            availableRoleNames = allRoles
                .filter(role => role.name !== 'Admin')
                .map(role => role.name);
        } else if (currentUserRole === 'HR') {
            availableRoleNames = ['Factory Manager', 'Manager', 'Leader', 'Assistant Leader', 'Worker'];
        } else if (currentUserRole === 'Factory Director') {
            availableRoleNames = [];
        } else {
            availableRoleNames = [];
        }

        const filtered = allRoles.filter(role => availableRoleNames.includes(role.name));
        setFilteredRoles(filtered);
    };

    const getRoleFieldRequirements = (roleName) => {
        const requirements = {
            'Factory Manager': { requireDept: true, requireLine: false, requireSubLine: false, requiredWordUnit: false, requireSkill: false },
            'Manager': { requireDept: true, requireLine: true, requireSubLine: false, requiredWordUnit: false, requireSkill: false },
            'Leader': { requireDept: true, requireLine: true, requireSubLine: true, requiredWordUnit: false, requireSkill: true },
            'Assistant Leader': { requireDept: true, requireLine: true, requireSubLine: true, requiredWordUnit: false, requireSkill: true },
            'Worker': { requireDept: true, requireLine: true, requireSubLine: true, requiredWordUnit: true, requireSkill: true },
            'HR': { requireDept: false, requireLine: false, requireSubLine: false, requiredWordUnit: false, requireSkill: false },
            'Admin': { requireDept: false, requireLine: false, requireSubLine: false, requiredWordUnit: false, requireSkill: false },
            'Factory Director': { requireDept: false, requireLine: false, requireSubLine: false, requiredWordUnit: false, requireSkill: false }
        };
        return requirements[roleName] || { requireDept: false, requireLine: false, requireSubLine: false, requiredWordUnit: false, requireSkill: false };
    };

    const getSelectedRoleName = () => {
        if (!form.roleId) return null;
        const role = roles.find(r => r.id === parseInt(form.roleId));
        return role ? role.name : null;
    };

    const selectedRoleName = getSelectedRoleName();
    const fieldRequirements = selectedRoleName ? getRoleFieldRequirements(selectedRoleName) : { requireDept: false, requireLine: false, requireSkill: false };

    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'fullName':
                if (!value.trim()) error = 'Full name is required.';
                break;
            case 'email':
                if (!value.trim()) error = 'Email is required.';
                else {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(value)) error = 'Invalid email address.';
                }
                break;
            case 'phone':
                if (!value.trim()) error = 'Phone number is required.';
                else {
                    const phoneRegex = /^[0-9]{10,11}$/;
                    if (!phoneRegex.test(value)) error = 'Phone number must be 10-11 digits.';
                }
                break;
            case 'password':
                if (!value) error = 'Password is required.';
                else if (value.length < 6) error = 'Password must be at least 6 characters.';
                break;
            case 'confirmPassword':
                if (!value) error = 'Confirm password is required.';
                else if (value !== form.password) error = 'Passwords do not match.';
                break;
            case 'gender':
                if (value === '') error = 'Please select a gender.';
                break;
            case 'roleId':
                if (!value) error = 'Please select a role.';
                break;
            case 'departmentId':
                if (fieldRequirements.requireDept && !value) error = 'Please select a department.';
                break;
            case 'parentLineId':
                if (fieldRequirements.requireLine && !value) error = 'Please select a section.';
                break;
            case 'lineId':
                if (fieldRequirements.requireSubLine && !value) error = 'Please select a sub-section.';
                break;
            case 'subLineId':
                if (fieldRequirements.requiredWordUnit && !value) error = 'Please select a work unit.';
                break;
            case 'skillLevelId':
                if (fieldRequirements.requireSkill && !value) error = 'Please select a skill level.';
                break;
            case 'baseSalary':
                if (value && isNaN(value)) error = 'Base salary must be a number.';
                break;
            default:
                break;
        }

        return error;
    };

    const onChange = async (e) => {
    const { name, value } = e.target;
    
    // Cập nhật form state ngay
    const updatedForm = { ...form, [name]: value };
    setForm(updatedForm);

    // Validate field
    const fieldError = validateField(name, value);
    setFieldErrors(prev => ({...prev, [name]: fieldError}));

    if (error) setError('');

    // clear duplicate user when role changes
    if (name === 'roleId') {
        setDuplicateUser(null);
        setShowDuplicateModal(false);
    }

        // Lấy role đã chọn để sử dụng trong hàm
    const selectedRoleId = updatedForm.roleId;
    const selectedRoleObj = selectedRoleId ? roles.find(r => r.id === parseInt(selectedRoleId)) : null;
    const selectedRoleName = selectedRoleObj ? selectedRoleObj.name : null;

        console.log('DEBUG: onChange name=' + name + ', selectedRoleName=' + selectedRoleName);

        // Xử lý Dept selection
    if (name === 'departmentId' && value) {
        try {
            const parents = await formDataService.getRootLines(value);
            console.log('Loaded parent lines:', parents);
            setParentLines(Array.isArray(parents) ? parents : []);

            const isFactoryManager = selectedRoleName === 'Factory Manager';
            if (!isFactoryManager) {
                setForm(prev => ({ ...prev, parentLineId: '', lineId: '', subLineId: '' }));
            }
            
            setChildLines([]);
            setSubLines([]);
            setDuplicateUser(null);
            setShowDuplicateModal(false);

        } catch (err) {
            console.error('Failed to load sections:', err);
            setParentLines([]);
        }
    }

    // Xử lý Section selection
    if (name === 'parentLineId' && value) {
        try {
            const children = await formDataService.getChildLines(value);
            console.log('Loaded child lines:', children);
            setChildLines(Array.isArray(children) ? children : []);
            setForm(prev => ({ ...prev, lineId: '', subLineId: '' }));
            setSubLines([]);
            setDuplicateUser(null);
            setShowDuplicateModal(false);
        } catch (err) {
            console.error('Failed to load sub-sections:', err);
            setChildLines([]);
        }
    }

    // Xử lý Sub-Section selection
    if (name === 'lineId' && value) {
        try {
            const subChildren = await formDataService.getChildLines(value);
            setSubLines(Array.isArray(subChildren) ? subChildren : []);
            setForm(prev => ({ ...prev, subLineId: '' }));
            setDuplicateUser(null);
            setShowDuplicateModal(false);
        } catch (err) {
            console.error('Failed to load work units:', err);
            setSubLines([]);
        }
    }

    // ========== KIỂM TRA DUPLICATE USER ==========
    let shouldCheckDuplicate = false;

    // 1. HR - Kiểm tra duplicate ngay khi chọn Role
    if (name === 'roleId' && selectedRoleName === 'HR') {
        shouldCheckDuplicate = true;
        console.log('DEBUG: HR role selected, will check duplicate');
    }
    // 2. Factory Director - Kiểm tra duplicate ngay khi chọn Role
    else if (name === 'roleId' && selectedRoleName === 'Factory Director') {
        shouldCheckDuplicate = true;
        console.log('DEBUG: Factory Director role selected, will check duplicate');
    }
    // 3. Admin - Kiểm tra duplicate ngay khi chọn Role
    else if (name === 'roleId' && selectedRoleName === 'Admin') {
        shouldCheckDuplicate = true;
        console.log('DEBUG: Admin role selected, will check duplicate');
    }
    // 4. Factory Manager - Kiểm tra duplicate khi chọn Department
    else if (name === 'departmentId' && selectedRoleName === 'Factory Manager' && value) {
        shouldCheckDuplicate = true;
        console.log('DEBUG: Factory Manager with department selected, will check duplicate');
    }

    // 5. Manager - Kiểm tra duplicate khi chọn Section (parentLineId)
    else if (name === 'parentLineId' && selectedRoleName === 'Manager' && value) {
        shouldCheckDuplicate = true;
        console.log('DEBUG: Manager with section selected, will check duplicate');
    }
    // 6. Leader/Assistant Leader - Kiểm tra duplicate khi chọn Sub Section (lineId)
    else if (name === 'lineId' && (selectedRoleName === 'Leader' || selectedRoleName === 'Assistant Leader') && value) {
        shouldCheckDuplicate = true;
        console.log('DEBUG: Leader/Assistant Leader with sub-section selected, will check duplicate');
    }


    // Thực hiện kiểm tra duplicate
    if (shouldCheckDuplicate && selectedRoleId) {
        try {
            const noNeedDept = ['Factory Director', 'HR', 'Admin'].includes(selectedRoleName);
            const currentDeptId = name === 'departmentId' ? value : updatedForm.departmentId;
            const currentParentLineId = name === 'parentLineId' ? value : updatedForm.parentLineId;
            const currentLineId = name === 'lineId' ? value : updatedForm.lineId;

            console.log('DEBUG: Attempting duplicate check:');
            console.log('  - selectedRoleName:', selectedRoleName);
            console.log('  - noNeedDept:', noNeedDept);
            console.log('  - currentDeptId:', currentDeptId);
            console.log('  - roleId:', selectedRoleId);

            let shouldProceed = false;

            if (noNeedDept) {
                // HR, Factory Director, Admin - không cần Department
                shouldProceed = true;
            } else if (selectedRoleName === 'Factory Manager' && currentDeptId) {
                // Factory Manager - cần Department
                shouldProceed = true;
            } else if (selectedRoleName === 'Manager' && currentDeptId && currentParentLineId) {
                // Manager - cần Department + Section
                shouldProceed = true;
            } else if ((selectedRoleName === 'Leader' || selectedRoleName === 'Assistant Leader') && currentDeptId && currentLineId) {
                // Leader/Assistant Leader - cần Department + Sub Section
                shouldProceed = true;
            }

            if (shouldProceed) {
                console.log('DEBUG: Calling checkDuplicateUser with:', {
                    departmentId: currentDeptId || null,
                    parentLineId: currentParentLineId || null,
                    lineId: currentLineId || null,
                    subLineId: updatedForm.subLineId || null,
                    roleId: selectedRoleId
                });

                const duplicate = await formDataService.checkDuplicateUser(
                    currentDeptId || null,
                    currentParentLineId || null,
                    currentLineId || null,
                    updatedForm.subLineId || null,
                    parseInt(selectedRoleId)
                );

                if (duplicate) {
                    console.log('DEBUG: Duplicate found:', duplicate.fullName);
                    setDuplicateUser(duplicate);
                    setShowDuplicateModal(true);
                } else {
                    console.log('DEBUG: No duplicate found');
                    setDuplicateUser(null);
                    setShowDuplicateModal(false);
                }
            } else {
                console.log('DEBUG: Conditions not met, skipping duplicate check');
            }
        } catch (err) {
            console.error('Failed to check duplicate user:', err);
        }
    }
};


    const validate = () => {
        const errors = {};
        
        // Kiểm tra các field bắt buộc
        if (!form.fullName.trim()) errors.fullName = 'Full name is required.';
        if (!form.email.trim()) errors.email = 'Email is required.';
        if (!form.phone.trim()) errors.phone = 'Phone number is required.';
        if (!form.password) errors.password = 'Password is required.';
        if (!form.roleId) errors.roleId = 'Please select a role.';
        if (form.gender === '') errors.gender = 'Please select a gender.';

        if (fieldRequirements.requireDept && !form.departmentId) errors.departmentId = 'Please select a department.';
        if (fieldRequirements.requireLine && !form.parentLineId) errors.parentLineId = 'Please select a section.';
        if (fieldRequirements.requireSubLine && !form.lineId) errors.lineId = 'Please select a sub-section.';
        if (fieldRequirements.requiredWordUnit && !form.subLineId) errors.subLineId = 'Please select a work unit.';
        if (fieldRequirements.requireSkill && !form.skillLevelId) errors.skillLevelId = 'Please select a skill level.';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (form.email && !emailRegex.test(form.email)) errors.email = 'Invalid email address.';

        const phoneRegex = /^[0-9]{10,11}$/;
        if (form.phone && !phoneRegex.test(form.phone)) errors.phone = 'Phone number must be 10-11 digits.';

        if (form.password && form.password.length < 6) errors.password = 'Password must be at least 6 characters.';
        if (form.password && form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
        
        if (form.baseSalary && isNaN(form.baseSalary)) errors.baseSalary = 'Base salary must be a number.';

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validate()) {
            return;
        }

        setLoading(true);
        try {

            const selectedRole = roles.find(r => r.id === parseInt(form.roleId));
            const finalLineId = selectedRole && ['Leader', 'Assistant Leader', 'Worker'].includes(selectedRole.name)
                ? form.subLineId
                : form.lineId;

            const registerData = {
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                password: form.password,
                roleId: parseInt(form.roleId),
                departmentId: parseInt(form.departmentId),
                verificationMethod: form.verificationMethod,
                gender: form.gender === 'true',
                lineId: finalLineId ? parseInt(finalLineId) : null,
                skillLevelId: form.skillLevelId ? parseInt(form.skillLevelId) : null,
                salaryType: form.salaryType || 'TimeBased',
                baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : null,
                hireDate: form.hireDate || null
            };

            const response = await authService.register(registerData);

            if (response.success) {
                // Redirect to verification page with token
                navigate('/verify-registration', {
                    state: { 
                        token: response.data.token,
                        verificationMethod: form.verificationMethod 
                    }
                });
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Registration failed.');
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: 2
            }}
        >
            <Container maxWidth="sm">
                <Paper
                    elevation={10}
                    sx={{padding: 4,borderRadius: 3,backgroundColor: 'rgba(255, 255, 255, 0.95)'}}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h5" component="h1" fontWeight="bold" color="primary" gutterBottom>
                            Register New Employee
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                
                    {duplicateUser && (
                        <Alert severity="error" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box>
                                <strong>User Already Exists!</strong>
                                <br/>
                                <Typography variant="caption">
                                    {duplicateUser.fullName} ({duplicateUser.email}) is already registered for this position.
                                </Typography>
                            </Box>
                        </Alert>
                    )}

                    <form onSubmit={onSubmit}>
                        {/* Full Name */}
                        <TextField
                            fullWidth
                            label="Full Name"
                            name="fullName"
                            value={form.fullName}
                            onChange={onChange}
                            margin="normal"
                            required
                            placeholder="Enter full name"
                            disabled={loading}
                            error={!!fieldErrors.fullName}
                            helperText={fieldErrors.fullName || 'Enter your complete full name'}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        />

                        {/* Email */}
                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={onChange}
                            margin="normal"
                            required
                            placeholder="example@email.com"
                            disabled={loading}
                            error={!!fieldErrors.email}
                            helperText={fieldErrors.email || 'Use a valid email address'}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        />

                        {/* Phone */}
                        <TextField
                            fullWidth
                            label="Phone Number"
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                            margin="normal"
                            required
                            placeholder="0123456789 ( 10-11 digits )"
                            disabled={loading}
                            error={!!fieldErrors.phone}
                            helperText={fieldErrors.phone || 'Phone must be 10-11 digits'}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        />

                        {/* Password */}
                        <TextField
                            fullWidth
                            label="Password"
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={onChange}
                            margin="normal"
                            required
                            placeholder="At least 6 characters"
                            disabled={loading}
                            error={!!fieldErrors.password}
                            helperText={fieldErrors.password || 'Minimum 6 characters required'}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        />

                        {/* Confirm Password */}
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            name="confirmPassword"
                            type="password"
                            value={form.confirmPassword}
                            onChange={onChange}
                            margin="normal"
                            required
                            disabled={loading}
                            error={!!fieldErrors.confirmPassword}
                            helperText={fieldErrors.confirmPassword || 'Re-enter your password'}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        />

                        {/* Gender */}
                        <TextField
                            fullWidth
                            select
                            label="Gender"
                            name="gender"
                            value={form.gender}
                            onChange={onChange}
                            margin="normal"
                            required
                            disabled={loading}
                            error={!!fieldErrors.gender}
                            helperText={fieldErrors.gender || ''}
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        >
                            <MenuItem value="">-- Select Gender --</MenuItem>
                            <MenuItem value="true">Male</MenuItem>
                            <MenuItem value="false">Female</MenuItem>
                        </TextField>

                        {/* Role ID */}
                        <TextField
                            fullWidth
                            select
                            label="Job Position"
                            name="roleId"
                            value={form.roleId}
                            onChange={onChange}
                            margin="normal"
                            required
                            disabled={loading || !currentUser || filteredRoles.length === 0}
                            error={!!fieldErrors.roleId}
                            helperText={
                                fieldErrors.roleId
                                    ? fieldErrors.roleId
                                    : !currentUser
                                    ? "Please log in to see available positions"
                                    : filteredRoles.length === 0
                                    ? "You do not have permission to register users with any positions"
                                    : "Select an appropriate job position"
                            }
                            sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                        >
                            <MenuItem value="">-- Chọn vị trí --</MenuItem>
                            {filteredRoles.map((role) => (
                                <MenuItem key={role.id} value={role.id}>
                                    {role.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Department ID */}
                        {fieldRequirements.requireDept && (
                            <TextField
                                fullWidth
                                select
                                label="Department"
                                name="departmentId"
                                value={form.departmentId}
                                onChange={onChange}
                                margin="normal"
                                required={fieldRequirements.requireDept}
                                disabled={loading}
                                error={!!fieldErrors.departmentId}
                                helperText={fieldErrors.departmentId || 'Select your working department'}
                                sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                            >
                                <MenuItem value="">-- Select Department --</MenuItem>
                                {departments.map((dept) => (
                                    <MenuItem key={dept.id} value={dept.id}>
                                        {dept.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* Parent Line ID - Section */}
                        {fieldRequirements.requireLine && (
                            <TextField
                                fullWidth
                                select
                                label="Section"
                                name="parentLineId"
                                value={form.parentLineId}
                                onChange={onChange}
                                margin="normal"
                                required={fieldRequirements.requireLine}
                                disabled={loading || !form.departmentId}
                                error={!!fieldErrors.parentLineId}
                                helperText={fieldErrors.parentLineId || (!form.departmentId ? "Please select a department first" : "Select your working section")}
                                sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                            >
                                <MenuItem value="">-- Select Section --</MenuItem>
                                {parentLines.map((line) => (
                                    <MenuItem key={line.id} value={line.id}>
                                        {line.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* Line ID - Sub Section */}
                        {fieldRequirements.requireSubLine && (
                            <TextField
                                fullWidth
                                select
                                label="Sub Section"
                                name="lineId"
                                value={form.lineId}
                                onChange={onChange}
                                margin="normal"
                                required={fieldRequirements.requireSubLine}
                                disabled={loading || !form.parentLineId}
                                error={!!fieldErrors.lineId}
                                helperText={fieldErrors.lineId || (!form.parentLineId ? "Please select a section first" : "Select your working sub-section")}
                                sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                            >
                                <MenuItem value="">-- Select Sub Section --</MenuItem>
                                {childLines.map((line) => (
                                    <MenuItem key={line.id} value={line.id}>
                                        {line.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* Sub Line ID - Work Unit */}
                        {fieldRequirements.requiredWordUnit && (
                            <TextField
                                fullWidth
                                select
                                label="Work Unit"
                                name="subLineId"
                                value={form.subLineId}
                                onChange={onChange}
                                margin="normal"
                                required={fieldRequirements.requireSubLine}
                                disabled={loading || !form.lineId}
                                error={!!fieldErrors.subLineId}
                                helperText={fieldErrors.subLineId || (!form.lineId ? "Please select a sub-section first" : "Select your specific work unit")}
                                sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                            >
                                <MenuItem value="">-- Select Work Unit --</MenuItem>
                                {subLines.map((line) => (
                                    <MenuItem key={line.id} value={line.id}>
                                        {line.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* Skill Level */}
                        {fieldRequirements.requireSkill && (
                            <TextField
                                fullWidth
                                select
                                label="Skill Level"
                                name="skillLevelId"
                                value={form.skillLevelId}
                                onChange={onChange}
                                margin="normal"
                                required={fieldRequirements.requireSkill}
                                disabled={loading}
                                error={!!fieldErrors.skillLevelId}
                                helperText={fieldErrors.skillLevelId || 'Select your current skill level'}
                                sx={{'.MuiFormLabel-asterisk': { color: 'red' }}}
                            >
                                <MenuItem value="">-- Select Skill Level --</MenuItem>
                                {skillLevels.map((level) => (
                                    <MenuItem key={level.id} value={level.id}>
                                        {level.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        )}

                        {/* Salary Type */}
                        <TextField
                            fullWidth
                            select
                            label="Salary Type"
                            name="salaryType"
                            value={form.salaryType}
                            onChange={onChange}
                            margin="normal"
                            disabled={loading}
                            helperText="Select your salary calculation type"
                        >
                            <MenuItem value="TimeBased">Time Based</MenuItem>
                            <MenuItem value="ProductBased">Product Based</MenuItem>
                        </TextField>

                        {/* Base Salary */}
                        <TextField
                            fullWidth
                            label="Base Salary"
                            name="baseSalary"
                            type="number"
                            value={form.baseSalary}
                            onChange={onChange}
                            margin="normal"
                            placeholder="8000000"
                            disabled={loading}
                            error={!!fieldErrors.baseSalary}
                            helperText={fieldErrors.baseSalary || 'Enter salary in VND'}
                        />

                        {/* Hire Date */}
                        <TextField
                            fullWidth
                            label="Hire Date"
                            name="hireDate"
                            type="date"
                            value={form.hireDate}
                            onChange={onChange}
                            margin="normal"
                            InputLabelProps={{ shrink: true }}
                            disabled={loading}
                            helperText="Select your employment date"
                        />

                        {/* Verification Method */}
                        <TextField
                            fullWidth
                            select
                            label="Verification Method"
                            name="verificationMethod"
                            value={form.verificationMethod}
                            onChange={onChange}
                            margin="normal"
                            disabled={loading}
                            helperText="Choose how to verify your account"
                        >
                            <MenuItem value="EMAIL">Email</MenuItem>
                            <MenuItem value="PHONE">SMS (Phone Number)</MenuItem>
                        </TextField>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            size="large"
                            disabled={loading || !!duplicateUser}
                            sx={{
                                mt: 3,
                                mb: 2,
                                py: 1.5,
                                fontSize: '16px',
                                fontWeight: 'bold',
                                background: !!duplicateUser ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                '&:hover': {
                                    background: !!duplicateUser ? '#ccc' : 'linear-gradient(135deg, #5568d3 0%, #65408b 100%)',
                                }
                            }}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : !!duplicateUser ? (
                                'User Already Exists'
                            ) : (
                                'Register'
                            )}
                        </Button>
                    </form>

                    {/* Link to Login */}
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            Already have an account?{' '}
                            <span
                                onClick={() => navigate('/login')}
                                style={{color: '#667eea',cursor: 'pointer',fontWeight: 'bold',textDecoration: 'underline'}}>
                Login now
            </span>
                        </Typography>
                    </Box>
                </Paper>
            </Container>

            {/* Modal exist user role */}
            <Dialog open={showUserModal} onClose={() => setShowUserModal(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', fontSize: '18px', color: '#667eea' }}>
                    Existing Users in This Department/Section
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                        The following users are already registered in this position:
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#667eea' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#667eea' }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: '#667eea' }}>Phone</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {existingUsers.map((user, index) => (
                                    <TableRow key={index} hover>
                                        <TableCell>{user.fullName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.phone}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowUserModal(false)} variant="contained" color="primary">
                        OK
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Modal duplicate user */}
            <Dialog open={showDuplicateModal} onClose={() => setShowDuplicateModal(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', fontSize: '18px', color: '#d32f2f', textAlign: 'center' }}>
                    User Already Exists
                </DialogTitle>
                <DialogContent>
                    {duplicateUser && (
                        <Box sx={{ mt: 2 }}>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                A user with this role is already registered in this position. You cannot register another user for the same position.
                            </Alert>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#333' }}>
                                Existing User Information:
                            </Typography>
                            <Paper sx={{ p: 2, backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                        <strong>Name:</strong> {duplicateUser.fullName}
                                    </Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                        <strong>Email:</strong> {duplicateUser.email}
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#666' }}>
                                        <strong>Phone:</strong> {duplicateUser.phone}
                                    </Typography>
                                </Box>
                            </Paper>
                            <Typography variant="caption" sx={{ mt: 2, display: 'block', color: '#999' }}>
                                Please contact HR or select a different position to register.
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setShowDuplicateModal(false);
                        setDuplicateUser(null);
                        // Xoá select
                        setForm(prev => ({ ...prev, departmentId: '', parentLineId: '', lineId: '', subLineId: '' }));
                        setParentLines([]);
                        setChildLines([]);
                        setSubLines([]);
                    }} variant="outlined" color="warning">
                        Change Selection
                    </Button>
                    <Button onClick={() => {
                        window.history.back();
                    }} variant="contained" color="error">
                        Exit Registration
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}