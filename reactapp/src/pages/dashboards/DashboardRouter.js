import { Navigate } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../../services/authService';
import AdminDashboard from './AdminDashboard';
import FDirectoryDashboard from './FDirectoryDashboard';
import FManagerDashboard from './FManagerDashboard';
import HRDashboard from './HRDashboard';
import ManagerDashboard from './ManagerDashboard';

const DashboardRouter = () =>
{
  // check authentication
  if (!isAuthenticated())
  {
    return <Navigate to="/login" replace />;
  }

  const user = getCurrentUser();
  const roleName = user?.roleName;
  console.log('Current user role:', roleName);

  switch (roleName)
  {
    case 'Admin':
      return <AdminDashboard />;
    case 'HR':
      return <HRDashboard />;
    case 'Manager':
      return <ManagerDashboard />;
    case 'Factory Manager':
    case 'FManager':
      return <FManagerDashboard />;
    case 'Factory Director':
    case 'FDirector':
      return <FDirectoryDashboard />;
    case 'Employee':
    default:
      return <AdminDashboard />;
  }
};

export default DashboardRouter;