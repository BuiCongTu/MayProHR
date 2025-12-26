import { CheckCircle, Error as ErrorIcon, Info, Logout as LogoutIcon, Menu as MenuIcon, Notifications, Person } from '@mui/icons-material';
import
{
    AppBar, Avatar, Badge, Box, Button, Divider,
    Drawer,
    IconButton,
    List, ListItem, ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu, MenuItem, Toolbar, Typography
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import { getMyNotifications, markAllAsRead, markAsRead } from '../../services/notificationService';

const drawerWidth = 240;

const getNavLinks = (roleName) =>
{
    let links = [];

    switch (roleName)
    {
        case 'Admin':
        case 'HR':
            links = [];
            break;

        case 'HR':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Employee List', path: '/users' },
                { title: 'Attendance', path: '/attendance' },
                { title: 'Leave Request', path: '/leave-request' },];
            break;

        case 'Manager':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'My Team', path: '/my-team' },
                { title: 'Attendance', path: '/attendance' },
                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Overtime Tickets', path: '/overtime-ticket' },

            ];
            break;

        case 'Factory Manager':
        case 'FManager':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'Employee List', path: '/users' },

                {
                    title: 'Pay Management',
                    path: '/payroll',
                    children: [
                        { title: 'Payroll Dasshboard', path: '/payroll' },
                        { title: 'Allowances', path: '/payroll/allowances/recurring' },
                        { title: 'Holidays', path: '/payroll/holidays' },
                        { title: 'Deduction', path: '/payroll/tax-deduction' },
                        { title: 'Tax Bracket', path: '/payroll/tax-bracket' },
                        { title: 'Production', path: '/payroll/production' },
                        { title: 'Employee Production', path: '/payroll/employee-production' },
                        { title: 'Reconcile Tool', path: '/payroll/reconcile' },
                    ],
                },

                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Proposal', path: '/position-change' },
                { title: 'Attendance', path: '/attendance/register-face' },
                { title: 'Leave Request', path: '/leave-request' },
                { title: 'Reports', path: '/payroll/report' },
            ];
            break;

        case 'Factory Director':
        case 'FDirector':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                {
                    title: 'Pay Management',
                    path: '/payroll',
                    children: [
                        { title: 'Create', path: '/payroll/create' },
                        { title: 'Payroll Dasshboard', path: '/payroll' },
                        { title: 'Allowances', path: '/payroll/allowances/recurring' },
                        { title: 'Holidays', path: '/payroll/holidays' },
                        { title: 'Deduction', path: '/payroll/tax-deduction' },
                        { title: 'Tax Bracket', path: '/payroll/tax-bracket' },
                        { title: 'Production', path: '/payroll/production' },
                        { title: 'Employee Production', path: '/payroll/employee-production' },
                        { title: 'Reconcile Tool', path: '/payroll/reconcile' },
                    ],
                },
                { title: 'Overtime Requests', path: '/overtime-request' },
                { title: 'Proposal', path: '/factory-director/proposals' },
                { title: 'Leave Request', path: '/leave-request' },
                { title: 'Reconcile Tool', path: '/payroll/reconcile' },
                { title: 'Reports', path: '/payroll/report' },
            ];
            break;

        case 'Accounting':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                {
                    title: 'Pay Management',
                    path: '/payroll',
                    children: [
                        { title: 'Create', path: '/payroll/create' },
                        { title: 'Payroll Dasshboard', path: '/payroll' },
                        { title: 'Allowances', path: '/payroll/allowances/recurring' },
                        { title: 'Holidays', path: '/payroll/holidays' },
                        { title: 'Deduction', path: '/payroll/tax-deduction' },
                        { title: 'Tax Bracket', path: '/payroll/tax-bracket' },
                        { title: 'Production', path: '/payroll/production' },
                        { title: 'Employee Production', path: '/payroll/employee-production' },
                        { title: 'Reconcile Tool', path: '/payroll/reconcile' },
                    ],
                },
                { title: 'Reports', path: '/payroll/report' },
                { title: 'Reconcile Tool', path: '/payroll/reconcile' },
            ];
            break;

        case 'Employee':
            links = [
                { title: 'Dashboard', path: '/dashboard' },
                { title: 'My Attendance', path: '/attendance/history' },
                { title: 'Check In', path: '/attendance/checkin' },
                { title: 'Check Out', path: '/attendance/checkout' },
                { title: 'Leave Request', path: '/leave-request' },
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

    const [payrollMenuAnchor, setPayrollMenuAnchor] = useState(null);

    // Responsive Drawer State
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobilePayrollOpen, setMobilePayrollOpen] = useState(false);

    const { subscribe, connected } = useWebSocket();

    // --- 1. INITIAL LOAD ---
    useEffect(() =>
    {
        if (navbarRef.current)
        {
            const height = navbarRef.current.offsetHeight;
            localStorage.setItem('navbarHeight', height);
        }

        if (isLoggedIn)
        {
            fetchNotifications();
        }
    }, [user?.roleName, isLoggedIn]);

    const fetchNotifications = async () =>
    {
        try
        {
            const data = await getMyNotifications(0, 20); // Get last 20
            if (data && data.content)
            {
                setNotifications(data.content);
                // Calculate unread from history
                const unread = data.content.filter(n => n.status === 'sent').length;
                setUnreadCount(unread);
            }
        } catch (e)
        {
            console.error("Failed to load notifications");
        }
    };

    // --- 2. WEBSOCKET LISTENER ---
    useEffect(() =>
    {
        if (!connected || !isLoggedIn) return;

        const sub = subscribe('/user/queue/notifications', (payload) =>
        {
            console.log("🔔 WebSocket Notification:", payload);
            let notifObj = typeof payload === 'string' ? { message: payload } : payload;

            const newNotif = {
                id: notifObj.id || Date.now(),
                message: notifObj.message,
                type: notifObj.type || 'info',
                sentDate: notifObj.sentDate || new Date().toISOString(),
                status: 'sent'
            };

            toast.info(newNotif.message, {
                position: "bottom-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });

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
    const handleDrawerToggle = () => setMobileOpen(!mobileOpen);

    const handlePayrollMenuOpen = (event) => setPayrollMenuAnchor(event.currentTarget);
    const handlePayrollMenuClose = () => setPayrollMenuAnchor(null);

    const handleProfile = () => { handleMenuClose(); navigate('/profile'); };
    const handleLogout = () => { handleMenuClose(); navigate('/logout'); };

    const handleMarkAllRead = async () =>
    {
        await markAllAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
        setUnreadCount(0);
    }

    const handleNotifItemClick = async (notif) =>
    {
        handleNotificationClose();
        if (notif.status === 'sent')
        {
            await markAsRead(notif.id);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'read' } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        const msg = notif.message || '';

        // ✅ LeaveRequest MUST be checked BEFORE "Request #"
        const leaveMatch = msg.match(/Leave\s*Request\s*#(\d+)/i);
        if (leaveMatch)
        {
            navigate(`/leave-request/${leaveMatch[1]}`);
            return;
        }

        const overtimeReqMatch = msg.match(/\bRequest\s*#(\d+)\b/i);
        if (overtimeReqMatch)
        {
            navigate(`/overtime-request/${overtimeReqMatch[1]}`);
            return;
        }

        const ticketMatch = msg.match(/\bTicket\s*#(\d+)\b/i);
        if (ticketMatch)
        {
            navigate(`/overtime-ticket/${ticketMatch[1]}`);
            return;
        }

        if (msg.toLowerCase().includes("leave"))
        {
            navigate('/leave-request');
        }
    };

    // Helpers
    const getAvatarImage = () =>
    {
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

    const getNotifIcon = (msg, type) =>
    {
        if (type === 'approval' || msg.toLowerCase().includes('approved')) return <CheckCircle fontSize="small" color="success" />;
        if (type === 'rejection' || msg.toLowerCase().includes('rejected')) return <ErrorIcon fontSize="small" color="error" />;
        return <Info fontSize="small" color="info" />;
    };

    const payrollLink = navLinks.find(l => l.title === 'Pay Management' && Array.isArray(l.children));
    const payrollChildren = payrollLink?.children || [];

    // --- MOBILE DRAWER CONTENT ---
    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Box sx={{ py: 2, backgroundColor: '#1976d2', color: 'white' }}>
                <Typography variant="h6" fontWeight="bold">MayPayHR</Typography>
                <Typography variant="caption">{user?.roleName}</Typography>
            </Box>
            <Divider />
            <List>
                {navLinks.map((link) =>
                {
                    const hasChildren = Array.isArray(link.children) && link.children.length > 0;

                    if (!hasChildren)
                    {
                        return (
                            <ListItem key={link.title} disablePadding>
                                <ListItemButton
                                    component={Link}
                                    to={link.path}
                                    selected={location.pathname === link.path}
                                    sx={{ textAlign: 'left', pl: 4 }}
                                >
                                    <ListItemText primary={link.title} />
                                </ListItemButton>
                            </ListItem>
                        );
                    }

                    return (
                        <Box key={link.title}>
                            <ListItem disablePadding>
                                <ListItemButton
                                    onClick={(e) =>
                                    {
                                        e.stopPropagation();
                                        setMobilePayrollOpen(v => !v);
                                    }}
                                    sx={{ textAlign: 'left', pl: 4 }}
                                >
                                    <ListItemText primary={link.title} />
                                </ListItemButton>
                            </ListItem>

                            {mobilePayrollOpen && link.children.map((child) => (
                                <ListItem key={child.title} disablePadding>
                                    <ListItemButton
                                        component={Link}
                                        to={child.path}
                                        selected={location.pathname === child.path}
                                        sx={{ textAlign: 'left', pl: 7 }}
                                    >
                                        <ListItemText primary={child.title} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </Box>
                    );
                })}
            </List>
        </Box>
    );

    return (
        <>
            <AppBar ref={navbarRef} position="static" sx={{ backgroundColor: '#4b90f9ff', color: '#ffffffff' }}>
                <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>

                    {/* --- LEFT SECTION: Logo & Nav --- */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>

                        {/* Hamburger Icon (Visible on small screens only) */}
                        {isLoggedIn && navLinks.length > 0 && (
                            <IconButton
                                color="inherit"
                                aria-label="open drawer"
                                edge="start"
                                onClick={handleDrawerToggle}
                                sx={{ mr: 2, display: { md: 'none' } }} // Show on < md (Tablet/Mobile)
                            >
                                <MenuIcon />
                            </IconButton>
                        )}

                        {/* Logo */}
                        <Box
                            component="img"
                            src={`${process.env.PUBLIC_URL}/images/logosg3.png`}
                            alt="MayPayHR Logo"
                            sx={{ height: 40, marginRight: 2, cursor: 'pointer' }}
                            onClick={() => navigate('/')}
                            onError={(e) => { e.target.style.display = 'none'; }}
                        />

                        {/* Desktop Navigation (Visible on md and up) */}
                        {isLoggedIn && navLinks.length > 0 && (
                            <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                                {navLinks.map((link) =>
                                {
                                    const hasChildren = Array.isArray(link.children) && link.children.length > 0;

                                    if (!hasChildren)
                                    {
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
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {link.title}
                                            </Button>
                                        );
                                    }

                                    const isAnyChildActive = link.children.some(c => location.pathname === c.path);

                                    return (
                                        <Box key={link.title} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                            <Button
                                                color="inherit"
                                                onClick={handlePayrollMenuOpen}
                                                sx={{
                                                    textDecoration: 'none', margin: '0 4px', fontSize: '13px',
                                                    ...((isAnyChildActive || location.pathname === link.path) && { backgroundColor: 'rgba(255, 255, 255, 0.2)', fontWeight: 'bold' }),
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                {link.title}
                                            </Button>

                                            <Menu
                                                anchorEl={payrollMenuAnchor}
                                                open={Boolean(payrollMenuAnchor)}
                                                onClose={handlePayrollMenuClose}
                                                transformOrigin={{ horizontal: 'left', vertical: 'top' }}
                                                anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
                                            >
                                                {payrollChildren.map((child) => (
                                                    <MenuItem
                                                        key={child.title}
                                                        onClick={() =>
                                                        {
                                                            handlePayrollMenuClose();
                                                            navigate(child.path);
                                                        }}
                                                        selected={location.pathname === child.path}
                                                    >
                                                        {child.title}
                                                    </MenuItem>
                                                ))}
                                            </Menu>
                                        </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>

                    {/* --- RIGHT SECTION: User Profile --- */}
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isLoggedIn ? (
                            <>
                                <IconButton color="inherit" onClick={handleNotificationClick} sx={{ mr: 0.5 }}>
                                    <Badge badgeContent={unreadCount} color="error">
                                        <Notifications fontSize="small" />
                                    </Badge>
                                </IconButton>

                                <Box
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '4px',
                                        '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                    }}
                                    onClick={handleMenuClick}
                                >
                                    {/* Responsive Text: Hide "Welcome" on mobile, ALWAYS SHOW Full Name */}
                                    <Box sx={{ mr: 1, textAlign: 'right' }}>
                                        <Typography variant="body2" sx={{ lineHeight: 1, display: { xs: 'none', md: 'block' } }}>
                                            Welcome,
                                        </Typography>
                                        <Typography variant="body2" sx={{ lineHeight: 1, whiteSpace: 'nowrap' }}>
                                            {user?.fullName || 'User'}
                                        </Typography>
                                    </Box>

                                    <Avatar src={avatarImage} sx={{ bgcolor: avatarImage ? 'transparent' : '#f50057', width: 32, height: 32, fontSize: '0.9rem' }}>
                                        {!avatarImage && (user?.fullName?.charAt(0) || 'U')}
                                    </Avatar>
                                </Box>

                                {/* ... Menus ... */}
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

            {/* --- MOBILE DRAWER COMPONENT --- */}
            <Box component="nav">
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        display: { xs: 'block', md: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>
        </>
    );
};

export default Navbar;
