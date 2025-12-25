import {
    AccessTime,
    Assessment,
    Business,
    CalendarToday,
    ChevronLeft,
    Dashboard,
    Menu as MenuIcon,
    People,
    RequestPage
} from '@mui/icons-material';

import {
    Box,
    Collapse,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography
} from '@mui/material';

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../../services/authService';

const drawerWidth = 240;

const getSidebarLinks = (roleName) => {
    switch (roleName) {
        case 'Admin':
            return [
                { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
                { title: 'Users', path: '/users', icon: <People /> },
                { title: 'Departments', path: '/departments', icon: <Business /> },
                {
                    title: 'Attendance',
                    icon: <CalendarToday />,
                    children: [
                        { title: 'Register Face', path: '/attendance/register-face' },
                        { title: 'Check In', path: '/attendance/checkin' },
                        { title: 'Check Out', path: '/attendance/checkout' }
                    ]
                },
                { title: 'Reports', path: '/reports', icon: <Assessment /> }
            ];

        case 'HR':
            return [
                { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
                { title: 'Employees List', path: '/users', icon: <People /> },
                {
                    title: 'Attendance',
                    icon: <CalendarToday />,
                    children: [
                        { title: 'Register Face', path: '/attendance/register-face' },
                        { title: 'Check In', path: '/attendance/checkin' },
                        { title: 'Check Out', path: '/attendance/checkout' }
                    ]
                },
                { title: 'Attendance Report', path: '/attendance/report', icon: <Assessment /> },
                { title: 'Leave Requests', path: '/leave-requests', icon: <RequestPage /> },
            ];

        default:
            return [];
    }
};

const Sidebar = () => {
    const location = useLocation();
    const user = getCurrentUser();

    const [open, setOpen] = useState(true);
    const [navbarHeight, setNavbarHeight] = useState(64);
    const [openAttendance, setOpenAttendance] = useState(true);

    const sidebarLinks = getSidebarLinks(user?.roleName);

    useEffect(() => {
        const height = localStorage.getItem('navbarHeight');
        if (height) setNavbarHeight(parseInt(height, 10));
    }, []);

    if (user?.roleName !== 'Admin' && user?.roleName !== 'HR') return null;

    return (
        <>
            {!open && (
                <IconButton
                    onClick={() => setOpen(true)}
                    sx={{ position: 'fixed', top: navbarHeight + 6, left: 10, zIndex: 1201 }}
                >
                    <MenuIcon />
                </IconButton>
            )}

            <Drawer
                variant="persistent"
                open={open}
                sx={{
                    width: drawerWidth,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        marginTop: `${navbarHeight}px`,
                        height: `calc(100vh - ${navbarHeight}px)`
                    }
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
                    <Typography variant="h6">Menu</Typography>
                    <IconButton onClick={() => setOpen(false)}>
                        <ChevronLeft />
                    </IconButton>
                </Box>

                <Divider />

                <List>
                    {sidebarLinks.map((link) => {

                        if (link.children) {
                            return (
                                <Box key={link.title}>
                                    <ListItem disablePadding>
                                        <ListItemButton onClick={() => setOpenAttendance(!openAttendance)}>
                                            <ListItemIcon>
                                                {link.icon ? link.icon : <CalendarToday />}
                                            </ListItemIcon>
                                            <ListItemText primary={link.title} />
                                        </ListItemButton>
                                    </ListItem>


                                    <Collapse in={openAttendance} timeout="auto" unmountOnExit>
                                        {link.children.map(child => (
                                            <ListItem key={child.title} disablePadding sx={{ pl: 3 }}>
                                                <ListItemButton
                                                    component={Link}
                                                    to={child.path}
                                                    selected={location.pathname === child.path}
                                                >
                                                    <ListItemText primary={child.title} />
                                                </ListItemButton>
                                            </ListItem>
                                        ))}
                                    </Collapse>
                                </Box>
                            );
                        }

                        return (
                            <ListItem key={link.title} disablePadding>
                                <ListItemButton
                                    component={Link}
                                    to={link.path}
                                    selected={location.pathname === link.path}
                                >
                                    <ListItemIcon>{link.icon}</ListItemIcon>
                                    <ListItemText primary={link.title} />
                                </ListItemButton>
                            </ListItem>
                        );
                    })}
                </List>
            </Drawer>

            {open && <Box sx={{ width: drawerWidth }} />}
        </>
    );
};

export default Sidebar;
