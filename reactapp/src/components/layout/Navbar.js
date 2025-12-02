import { Logout as LogoutIcon, Notifications, Person } from '@mui/icons-material';
import
{
    AppBar,
    Avatar,
    Badge,
    Box, Button,
    Divider,
    IconButton,
    Menu, MenuItem,
    Toolbar, Typography
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { toast } from 'react-toastify';

const getNavLinks = (roleName) =>
{
    let links = [];

    switch (roleName)
    {
        case 'Admin':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Users', path: '/users' },
                { title: 'Departments', path: '/departments' },
                { title: 'Reports', path: '/reports' },
            ];
            break;

        case 'HR':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Employees', path: '/users' },
                { title: 'Attendance', path: '/attendance' },
                { title: 'Leave Requests', path: '/leave-requests' },
                { title: 'Overtime Requests', path: '/overtime-request' },
            ];
            break;

        case 'Manager':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'My Team', path: '/my-team' },
                { title: 'Attendance', path: '/attendance' },
                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Overtime Tickets', path: '/overtime-ticket' },
                { title: 'Reports', path: '/reports' },
            ];
            break;

        case 'Factory Manager':
        case 'FManager':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Production Lines', path: '/lines' },
                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Attendance', path: '/attendance' },
                { title: 'Reports', path: '/reports' },
            ];
            break;

        case 'Factory Director':
        case 'FDirector':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Overview', path: '/overview' },
                { title: 'Reports', path: '/reports' },
            ];
            break;

        case 'Employee':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'My Attendance', path: '/attendance/history' },
                { title: 'Check In', path: '/attendance/checkin' },
                { title: 'Check Out', path: '/attendance/checkout' },
            ];
            break;

        default:
            links = [];
    }

    return links;
};

const Navbar = () =>
{
    const location = useLocation();
    const navigate = useNavigate();
    const user = getCurrentUser();
    const isLoggedIn = isAuthenticated();
    const navLinks = getNavLinks(user?.roleName);
    const navbarRef = useRef(null);

    // State cho dropdown menus
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);

    const { subscribe, connected } = useWebSocket();
    const [realtimeNotifs, setRealtimeNotifs] = useState([]);

    // Lưu chiều cao navbar vào localStorage khi component mount hoặc thay đổi
    useEffect(() =>
    {
        if (navbarRef.current)
        {
            const height = navbarRef.current.offsetHeight;
            localStorage.setItem('navbarHeight', height);
        }
    }, [user?.roleName, isLoggedIn]);

    const openMenu = Boolean(anchorEl);
    const openNotification = Boolean(notificationAnchor);

    // Mock notifications
    const notifications = [
        { id: 1, message: 'Có 5 đơn xin nghỉ phép chờ duyệt', time: '10 phút trước' },
        { id: 2, message: 'Báo cáo tháng 11 đã sẵn sàng', time: '1 giờ trước' },
        { id: 3, message: '3 nhân viên mới đã được thêm', time: '2 giờ trước' },
    ];

    const handleMenuClick = (event) =>
    {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () =>
    {
        setAnchorEl(null);
    };

    const handleNotificationClick = (event) =>
    {
        setNotificationAnchor(event.currentTarget);
    };

    const handleNotificationClose = () =>
    {
        setNotificationAnchor(null);
    };

    const handleProfile = () =>
    {
        handleMenuClose();
        navigate('/profile');
    };

    const handleLogout = () =>
    {
        handleMenuClose();
        navigate('/logout');
    };

    // Lấy avatar image dựa trên role và gender
    const getAvatarImage = () =>
    {
        const roleName = user?.roleName;
        const gender = user?.gender;


        if (roleName === 'Admin') return '/images/admin.jpeg';
        if (roleName === 'HR') return '/images/hr.jpeg';
        if (roleName === 'Manager') return '/images/manager.jpeg';
        if (roleName === 'Factory Manager' || roleName === 'FManager') return '/images/fmanager.jpeg';
        if (roleName === 'Factory Director' || roleName === 'FDirector') return '/images/fdirector.jpeg';

        // Employee: dựa vào gender
        if (gender === 0 || gender === 0) return '/images/female.jpeg';
        if (gender === 1 || gender === 1) return '/images/male.jpeg';

        // Default
        return null;
    };

    const avatarImage = getAvatarImage();

    return (
        <AppBar ref={navbarRef} position="static" sx={{
            backgroundColor: '#4b90f9ff', color: '#ffffffff'
        }}>
            <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
                {/* Logo + Title */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                        component="img"
                        src={`${process.env.PUBLIC_URL}/images/logosg3.png`}
                        alt="MayPayHR Logo"
                        sx={{
                            height: 50,
                            marginRight: 2,
                            cursor: 'pointer'
                        }}
                        onClick={() => navigate('/')}
                        onError={(e) =>
                        {
                            console.error('Logo failed to load');
                            e.target.style.display = 'none';
                        }}
                    />

                    {isLoggedIn && navLinks.length > 0 && user?.roleName !== 'Admin' && user?.roleName !== 'HR' && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {navLinks.map((link) =>
                            {
                                const isActive = location.pathname === link.path;

                                return (
                                    <Button
                                        key={link.title}
                                        color="inherit"
                                        component={Link}
                                        to={link.path}
                                        sx={{
                                            textDecoration: 'none',
                                            margin: '0 4px',
                                            ...(isActive && {
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                fontWeight: 'bold'
                                            }),
                                            fontSize: '13px',
                                        }}
                                    >
                                        {link.title}
                                    </Button>
                                );
                            })}
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {isLoggedIn ? (
                        <>
                            {/* Notification Icon */}
                            <IconButton
                                color="inherit"
                                onClick={handleNotificationClick}
                                sx={{ mr: 1 }}
                            >
                                <Badge badgeContent={notifications.length} color="error">
                                    <Notifications />
                                </Badge>
                            </IconButton>

                            {/* Welcome User + Avatar */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        fontWeight: 'bold',
                                    }
                                }}
                                onClick={handleMenuClick}
                            >
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                    Welcome, {user?.fullName || 'User'}
                                </Typography>
                                <Avatar
                                    src={avatarImage}
                                    sx={{
                                        bgcolor: avatarImage ? 'transparent' : '#f50057',
                                        width: 32,
                                        height: 32,
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {!avatarImage && (user?.fullName?.charAt(0) || 'U')}
                                </Avatar>
                            </Box>

                            {/* User Menu Dropdown */}
                            <Menu
                                anchorEl={anchorEl}
                                open={openMenu}
                                onClose={handleMenuClose}
                                onClick={handleMenuClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">
                                        {user?.fullName || 'User'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {user?.email || ''}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Role: {user?.roleName || 'N/A'}
                                    </Typography>
                                </Box>
                                <Divider />
                                <MenuItem onClick={handleProfile}>
                                    <Person sx={{ mr: 1 }} fontSize="small" />
                                    View Profile
                                </MenuItem>
                                <MenuItem onClick={handleLogout}>
                                    <LogoutIcon sx={{ mr: 1 }} fontSize="small" />
                                    Logout
                                </MenuItem>
                            </Menu>

                            {/* Notification Menu */}
                            <Menu
                                anchorEl={notificationAnchor}
                                open={openNotification}
                                onClose={handleNotificationClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{
                                    sx: { width: 320, maxHeight: 400 }
                                }}
                            >
                                <Box sx={{ px: 2, py: 1 }}>
                                    <Typography variant="h6">Notifications</Typography>
                                </Box>
                                <Divider />
                                {notifications.map((notif) => (
                                    <MenuItem
                                        key={notif.id}
                                        onClick={handleNotificationClose}
                                        sx={{ whiteSpace: 'normal', py: 1.5 }}
                                    >
                                        <Box>
                                            <Typography variant="body2">{notif.message}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {notif.time}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                                {notifications.length === 0 && (
                                    <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No new notifications
                                        </Typography>
                                    </Box>
                                )}
                            </Menu>
                        </>
                    ) : (
                        <Button
                            color="inherit"
                            component={Link}
                            to="/login"
                        >
                            Login
                        </Button>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;