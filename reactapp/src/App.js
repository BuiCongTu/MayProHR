import {useEffect} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import './App.css';
import Layout from "./components/layout/Layout";
import Register from "./components/Register";
import CheckInPage from "./pages/attendance/CheckInPage";
import CheckOutPage from "./pages/attendance/CheckOutPage";
import HistoryPage from "./pages/attendance/HistoryPage";
import RegisterFacePage from "./pages/attendance/RegisterFacePage";
import Login from "./pages/auth/Login";
import Logout from "./pages/auth/Logout";
import VerifyRegistration from "./pages/auth/VerifyRegistration";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import DashboardRouter from "./pages/dashboards/DashboardRouter";
import OvertimeRequestDetail from "./pages/moduleB/overtime/OvertimeRequestDetail";
import OvertimeRequestForm from "./pages/moduleB/overtime/OvertimeRequestForm";
import OvertimeRequestList from "./pages/moduleB/overtime/OvertimeRequestList";
import OvertimeTicketCreate from "./pages/moduleB/overtime/OvertimeTicketCreate";
import OvertimeTicketDetail from "./pages/moduleB/overtime/OvertimeTicketDetail";
import OvertimeTicketList from "./pages/moduleB/overtime/OvertimeTicketList";
import Profile from "./pages/profile/Profile";
import {setupAxiosInterceptors} from "./services/authService";
import {WebSocketProvider} from './contexts/WebSocketContext';
import PayrollRouter from "./pages/moduleC/PayrollRouter";


function App() {
    const getUserRole = () => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            const user = JSON.parse(userStr);
            return user.roleId;
        }
        return null;
    };

    const userRole = getUserRole();

    // Setup axios interceptors khi app khởi động
    useEffect(() => {
        setupAxiosInterceptors();
    }, []);

    return (
        <div className="App">
            <BrowserRouter>
                <WebSocketProvider>
                    <Routes>
                        <Route path="/" element={<Layout role={userRole}/>}>
                            <Route index element={<DashboardRouter/>}/>
                            <Route path="dashboard" element={<DashboardRouter/>}/>
                            <Route path="/overtime-request" element={<OvertimeRequestList/>}/>
                            <Route path="/overtime-request/create" element={<OvertimeRequestForm/>}/>
                            <Route path="/overtime-ticket" element={<OvertimeTicketList/>}/>
                            <Route path="/attendance/checkin" element={<CheckInPage/>}/>
                            <Route path="/attendance/checkout" element={<CheckOutPage/>}/>
                            <Route path="/attendance/register-face" element={<RegisterFacePage/>}/>
                            <Route path="/attendance/history" element={<HistoryPage/>}/>
                            <Route path="/overtime-request/:id" element={<OvertimeRequestDetail/>}/>
                            <Route path="/profile" element={<Profile/>}/>

                            <Route path="/payroll/*" element={<PayrollRouter/>}/>

                            {/* Ticket Routes */}
                            <Route path="/overtime-ticket" element={<OvertimeTicketList/>}/>
                            <Route path="/overtime-ticket/:id" element={<OvertimeTicketDetail/>}/>
                            <Route path="/overtime-ticket/create" element={<OvertimeTicketCreate/>}/>
                        </Route>

                        {/* Auth Routes */}
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/logout" element={<Logout/>}/>
                        <Route path="/register" element={<Register/>}/>
                        <Route path="/verify-registration" element={<VerifyRegistration/>}/>
                        <Route path="/forgot-password" element={<ForgotPassword/>}/>
                        <Route path="/reset-password" element={<ResetPassword/>}/>

                    </Routes>
                </WebSocketProvider>
            </BrowserRouter>
        </div>
    );
}

export default App;