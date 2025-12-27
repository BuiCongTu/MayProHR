import { Navigate, Route, Routes } from 'react-router-dom';
import AttendanceManagement from "../../components/ModuleA/AttendanceManagement";
import LeaveRequestManagement from "../../components/ModuleA/LeaveRequestManagement";
import CreatePayroll from '../../components/ModuleC/CreatePayroll';
import EmplRecurAllowance from '../../components/ModuleC/EmplRecurAllowance';
import EmployeeProductionInput from '../../components/ModuleC/EmployeeProductionInput';
import HolidayManagement from "../../components/ModuleC/HolidayManagement";
import PayrollApproval from '../../components/ModuleC/PayrollApproval';
import PayrollDetail from '../../components/ModuleC/PayrollDetail';
import PayrollEmployeeCalculator from '../../components/ModuleC/PayrollEmployeeCalculator';
import PayrollEmployeeDetail from '../../components/ModuleC/PayrollEmployeeDetail';
import PayrollList from '../../components/ModuleC/PayrollList';
import PayrollReconcileTool from "../../components/ModuleC/PayrollReconcileTool";
import PayrollReport from '../../components/ModuleC/PayrollReport';
import ProductionLineManagement from "../../components/ModuleC/ProductionLineManagement";
import ProductionManagement from "../../components/ModuleC/ProductionManagement";
import TaxBracketManagement from "../../components/ModuleC/TaxBracketManagement";
import TaxCalculator from '../../components/ModuleC/TaxCalculator';
import TaxDeductionManagement from "../../components/ModuleC/TaxDeductionManagement";
import { getCurrentUser } from '../../services/authService';
import PayrollAnalysis from './PayrollAnalysis';
import PayrollDashboard from './PayrollDashboard';

const isFactoryManagerRole = (roleName) =>
{
    const normalized = String(roleName || '')
        .toLowerCase()
        .replace(/\s+/g, '');
    return normalized === 'factorymanager' || normalized === 'fmanager';
};

const PayrollRouter = () =>
{
    const roleName = getCurrentUser()?.roleName;
    const isFactoryManager = isFactoryManagerRole(roleName);

    return (
        <Routes>
            <Route path="/" element={<PayrollDashboard />} />
            <Route path="/analysis" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollAnalysis />} />
            <Route path="/list" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollList />} />
            <Route path="/create" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <CreatePayroll />} />
            <Route path="/report" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollReport />} />
            <Route path="/tax-calculator" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <TaxCalculator />} />
            <Route path="/allowances/recurring" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <EmplRecurAllowance />} /> // phụ cấp thường xuyên cho nhân viên test ok
            <Route path="/holidays" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <HolidayManagement />} /> //test ok
            <Route path="/tax-deduction" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <TaxDeductionManagement />} /> // giảm trừ gia cảnh test ok
            <Route path="/tax-bracket" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <TaxBracketManagement />} /> // bảng liệt kê thuế tính theo bậc test ok
            <Route path="/production" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <ProductionManagement />} /> // ok test
            <Route path="/employee-production" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <EmployeeProductionInput />} /> //sản lượng của từng Emp theo tháng test ok
            <Route path="/attendance" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <AttendanceManagement />} /> // bảng chấm công test ok
            <Route path="/leave-request" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <LeaveRequestManagement />} /> // xin nghỉ phép test oko
            <Route path="/reconcile" element={<PayrollReconcileTool />} />
            <Route path="/production-line" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <ProductionLineManagement />} />
            <Route path="/:payrollId/calculate" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollEmployeeCalculator />} />
            <Route path="/:payrollId/approve" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollApproval />} />
            <Route path="/:payrollId/employee/:employeePayrollId" element={isFactoryManager ? <Navigate to="/payroll" replace /> : <PayrollEmployeeDetail />} />
            <Route path="/:payrollId" element={<PayrollDetail />} />
            <Route path="*" element={<Navigate to="/payroll" replace />} />

        </Routes>
    );
};

export default PayrollRouter;