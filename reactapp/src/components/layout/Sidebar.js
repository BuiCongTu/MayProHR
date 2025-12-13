import
{
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
import
{
  Box,
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

const getSidebarLinks = (roleName) =>
{
  let links = [];

  switch (roleName)
  {
    case 'Admin':
      links = [
        { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
        { title: 'Users', path: '/users', icon: <People /> },
        { title: 'Departments', path: '/departments', icon: <Business /> },
        { title: 'Reports', path: '/reports', icon: <Assessment /> },
      ];
      break;

    case 'HR':
      links = [
        { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
        { title: 'Employees List', path: '/users', icon: <People /> },
          {title: 'Pay Management', path: '/payroll'},
        { title: 'Attendance', path: '/attendance/register-face', icon: <CalendarToday /> },
        { title: 'Leave Requests', path: '/leave-requests', icon: <RequestPage /> },
        { title: 'Overtime Requests', path: '/overtime-request', icon: <AccessTime /> },
      ];
      break;

    default:
      links = [];
  }

  return links;
};

const Sidebar = () =>
{
  const location = useLocation();
  const user = getCurrentUser();
  const [open, setOpen] = useState(true);
  const [navbarHeight, setNavbarHeight] = useState(64); // Default height

  const sidebarLinks = getSidebarLinks(user?.roleName);

  // Lấy chiều cao navbar từ localStorage
  useEffect(() =>
  {
    const height = localStorage.getItem('navbarHeight');
    if (height)
    {
      setNavbarHeight(parseInt(height, 10));
    }
  }, []);

  const handleDrawerToggle = () =>
  {
    setOpen(!open);
  };

  // Chỉ hiển thị sidebar cho Admin và HR
  if (user?.roleName !== 'Admin' && user?.roleName !== 'HR')
  {
    return null;
  }

  return (
    <>
      {/* Toggle Button - Hiển thị khi sidebar đóng */}
      {!open && (
        <IconButton
          onClick={handleDrawerToggle}
          sx={{
            position: 'fixed',
            top: navbarHeight + 6,
            left: 10,
            zIndex: 1201,
            backgroundColor: '#9cc8f3ff',
            color: 'white',
            '&:hover': {
              backgroundColor: '#7ab3e8',
            }
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            marginTop: `${navbarHeight}px`,
            height: `calc(100vh - ${navbarHeight}px)`,
            backgroundColor: '#f5f5f5',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h6" color="primary">
            Menu
          </Typography>
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeft />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {sidebarLinks.map((link) =>
          {
            const isActive = location.pathname === link.path;

            return (
              <ListItem key={link.title} disablePadding>
                <ListItemButton
                  component={Link}
                  to={link.path}
                  selected={isActive}
                  sx={{
                    '&.Mui-selected': {
                      backgroundColor: '#9cc8f3ff',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: '#7ab3e8',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      }
                    },
                    '&:hover': {
                      backgroundColor: '#e3f2fd',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? 'white' : 'inherit' }}>
                    {link.icon}
                  </ListItemIcon>
                  <ListItemText primary={link.title} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {open && (
        <Box sx={{ width: drawerWidth, flexShrink: 0 }} />
      )}
    </>
  );
};

export default Sidebar;
