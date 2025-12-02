import { Logout as LogoutIcon, Notifications, Person, CheckCircle, Error as ErrorIcon, Info } from '@mui/icons-material';
import {
    AppBar, Avatar, Badge, Box, Button, Divider, IconButton, Menu, MenuItem, Toolbar, Typography, ListItemIcon, ListItemText
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getMyNotifications, markAsRead, markAllAsRead } from '../../services/notificationService';
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

    // --- STATE ---
    const [anchorEl, setAnchorEl] = useState(null);
    const [notificationAnchor, setNotificationAnchor] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const { subscribe, connected } = useWebSocket();

    // --- 1. INITIAL LOAD ---
    useEffect(() => {
        if (navbarRef.current) {
            const height = navbarRef.current.offsetHeight;
            localStorage.setItem('navbarHeight', height);
        }

        if (isLoggedIn) {
            fetchNotifications();
        }
    }, [user?.roleName, isLoggedIn]);

    const fetchNotifications = async () => {
        try {
            const data = await getMyNotifications(0, 20); // Get last 20
            if (data && data.content) {
                setNotifications(data.content);
                // Calculate unread from history
                const unread = data.content.filter(n => n.status === 'sent').length;
                setUnreadCount(unread);
            }
        } catch (e) {
            console.error("Failed to load notifications");
        }
    };

    // --- 2. WEBSOCKET LISTENER ---
    useEffect(() => {
        if (!connected || !isLoggedIn) return;

        // Subscribe to private queue
        const sub = subscribe('/user/queue/notifications', (payload) => {
            console.log("🔔 WebSocket Notification:", payload);

            // Handle different payload formats (String vs JSON DTO)
            let notifObj = typeof payload === 'string' ? { message: payload } : payload;

            // Ensure DTO structure match
            const newNotif = {
                id: notifObj.id || Date.now(),
                message: notifObj.message,
                type: notifObj.type || 'info',
                sentDate: notifObj.sentDate || new Date().toISOString(),
                status: 'sent' // It's new, so it's unread
            };

            // Show Toast
            toast.info(newNotif.message, {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });

            // Update List (Prepend new item)
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => { if (sub) sub.unsubscribe(); };
    }, [connected, isLoggedIn, subscribe]);


    // --- HANDLERS ---
    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleNotificationClick = (event) => setNotificationAnchor(event.currentTarget);
    const handleNotificationClose = () => setNotificationAnchor(null);

    const handleProfile = () => { handleMenuClose(); navigate('/profile'); };
    const handleLogout = () => { handleMenuClose(); navigate('/logout'); };

    const handleMarkAllRead = async () => {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({...n, status: 'read'})));
        setUnreadCount(0);
    }

    const handleNotifItemClick = async (notif) => {
        handleNotificationClose();

        // 1. Mark as read
        if (notif.status === 'sent') {
            await markAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        // 2. Navigation Logic (Regex Parsing)
        const msg = notif.message;

        if (msg.includes("Request #")) {
            const match = msg.match(/Request #(\d+)/);
            if (match) navigate(`/overtime-request/${match[1]}`);
        }
        else if (msg.includes("Ticket #")) {
            const match = msg.match(/Ticket #(\d+)/);
            if (match) navigate(`/overtime-ticket/${match[1]}`);
        }
        else if (msg.includes("Leave")) {
            navigate('/leave-requests');
        }
    };

    // Helpers
    const getAvatarImage = () => {
        const roleName = user?.roleName;
        const gender = user?.gender;
        if (roleName === 'Admin') return '/images/admin.jpeg';
        if (roleName === 'HR') return '/images/hr.jpeg';
        if (roleName === 'Manager') return '/images/manager.jpeg';
        if (roleName === 'Factory Manager' || roleName === 'FManager') return '/images/fmanager.jpeg';
        if (roleName === 'Factory Director' || roleName === 'FDirector') return '/images/fdirector.jpeg';
        if (gender === 0) return '/images/female.png';
        if (gender === 1) return '/images/male.png';
        return null;
    };
    const avatarImage = getAvatarImage();

    const getNotifIcon = (msg, type) => {
        if (type === 'approval' || msg.toLowerCase().includes('approved')) return <CheckCircle fontSize="small" color="success"/>;
        if (type === 'rejection' || msg.toLowerCase().includes('rejected')) return <ErrorIcon fontSize="small" color="error"/>;
        return <Info fontSize="small" color="info"/>;
    };

    return (
        <AppBar ref={navbarRef} position="static" sx={{ backgroundColor: '#4b90f9ff', color: '#ffffffff' }}>
            <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
                {/* Logo + Title */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box
                        component="img"
                        src={`${process.env.PUBLIC_URL}/images/logosg3.png`}
                        alt="MayPayHR Logo"
                        sx={{ height: 50, marginRight: 2, cursor: 'pointer' }}
                        onClick={() => navigate('/')}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />

                    {isLoggedIn && navLinks.length > 0 && user?.roleName !== 'Admin' && user?.roleName !== 'HR' && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {navLinks.map((link) => {
                                const isActive = location.pathname === link.path;
                                return (
                                    <Button
                                        key={link.title}
                                        color="inherit"
                                        component={Link}
                                        to={link.path}
                                        sx={{
                                            textDecoration: 'none', margin: '0 4px', fontSize: '13px',
                                            ...(isActive && { backgroundColor: 'rgba(255, 255, 255, 0.2)', fontWeight: 'bold' }),
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
                            <IconButton color="inherit" onClick={handleNotificationClick} sx={{ mr: 1 }}>
                                <Badge badgeContent={unreadCount} color="error">
                                    <Notifications />
                                </Badge>
                            </IconButton>

                            {/* Welcome User + Avatar */}
                            <Box
                                sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', fontWeight: 'bold' } }}
                                onClick={handleMenuClick}
                            >
                                <Typography variant="body2" sx={{ mr: 1 }}>Welcome, {user?.fullName || 'User'}</Typography>
                                <Avatar src={avatarImage} sx={{ bgcolor: avatarImage ? 'transparent' : '#f50057', width: 32, height: 32, fontSize: '0.9rem' }}>
                                    {!avatarImage && (user?.fullName?.charAt(0) || 'U')}
                                </Avatar>
                            </Box>

                            {/* User Menu Dropdown */}
                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                            >
                                <Box sx={{ px: 2, py: 1, minWidth: 200 }}>
                                    <Typography variant="subtitle1" fontWeight="bold">{user?.fullName || 'User'}</Typography>
                                    <Typography variant="body2" color="text.secondary">{user?.email || ''}</Typography>
                                    <Typography variant="caption" color="text.secondary">Role: {user?.roleName || 'N/A'}</Typography>
                                </Box>
                                <Divider />
                                <MenuItem onClick={handleProfile}><Person sx={{ mr: 1 }} fontSize="small" /> View Profile</MenuItem>
                                <MenuItem onClick={handleLogout}><LogoutIcon sx={{ mr: 1 }} fontSize="small" /> Logout</MenuItem>
                            </Menu>

                            {/* Notification Menu */}
                            <Menu
                                anchorEl={notificationAnchor}
                                open={Boolean(notificationAnchor)}
                                onClose={handleNotificationClose}
                                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                PaperProps={{ sx: { width: 360, maxHeight: 400 } }}
                            >
                                <Box sx={{ px: 2, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="h6" fontSize="1rem">Notifications</Typography>
                                    {unreadCount > 0 && (
                                        <Button size="small" onClick={handleMarkAllRead}>Mark all read</Button>
                                    )}
                                </Box>
                                <Divider />
                                {notifications.length === 0 ? (
                                    <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                        <Typography variant="body2">No notifications yet</Typography>
                                    </Box>
                                ) : (
                                    notifications.map((notif) => (
                                        <MenuItem
                                            key={notif.id}
                                            onClick={() => handleNotifItemClick(notif)}
                                            sx={{
                                                py: 1.5,
                                                whiteSpace: 'normal',
                                                bgcolor: notif.status === 'sent' ? 'action.hover' : 'inherit',
                                                borderLeft: notif.status === 'sent' ? '4px solid #1976d2' : 'none'
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36, mt: 0.5, alignSelf: 'flex-start' }}>
                                                {getNotifIcon(notif.message, notif.type)}
                                            </ListItemIcon>
                                            <Box>
                                                <Typography variant="body2" fontWeight={notif.status === 'sent' ? 'bold' : 'normal'} sx={{ lineHeight: 1.3 }}>
                                                    {notif.message}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                    {new Date(notif.sentDate).toLocaleString()}
                                                </Typography>
                                            </Box>
                                        </MenuItem>
                                    ))
                                )}
                            </Menu>
                        </>
                    ) : (
                        <Button color="inherit" component={Link} to="/login">Login</Button>
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;