import { Navigate, Route, Routes } from 'react-router-dom';
import AttendanceManagement from "../../components/ModuleA/AttendanceManagement";
import LeaveRequestManagement from "../../components/ModuleA/LeaveRequestManagement";
import CreatePayroll from '../../components/ModuleC/CreatePayroll';
import EmplRecurAllowance from '../../components/ModuleC/EmplRecurAllowance';
import EmployeeProductionInput from '../../components/ModuleC/EmployeeProductionInput';
import HolidayManagement from "../../components/ModuleC/HolidayManagement";
import PayrollApproval from '../../components/ModuleC/PayrollApproval';
import PayrollDetail from '../../components/ModuleC/PayrollDetail';
import PayrollList from '../../components/ModuleC/PayrollList';
import PayrollReport from '../../components/ModuleC/PayrollReport';
import ProductionLineManagement from "../../components/ModuleC/ProductionLineManagement";
import ProductionManagement from "../../components/ModuleC/ProductionManagement";
import TaxBracketManagement from "../../components/ModuleC/TaxBracketManagement";
import TaxCalculator from '../../components/ModuleC/TaxCalculator';
import TaxDeductionManagement from "../../components/ModuleC/TaxDeductionManagement";
import PayrollDashboard from './PayrollDashboard';

const PayrollRouter = () =>
{
    return (
        <Routes>
            <Route path="/" element={<PayrollDashboard />} />
            <Route path="/list" element={<PayrollList />} />
            <Route path="/create" element={<CreatePayroll />} />
            <Route path="/report" element={<PayrollReport />} />
            <Route path="/tax-calculator" element={<TaxCalculator />} />
            <Route path="/allowances/recurring" element={<EmplRecurAllowance />} /> // phụ cấp thường xuyên cho nhân viên test ok
            <Route path="/holidays" element={<HolidayManagement />} /> //test ok
            <Route path="/tax-deduction" element={<TaxDeductionManagement />} /> // giảm trừ gia cảnh test ok
            <Route path="/tax-bracket" element={<TaxBracketManagement />} /> // bảng liệt kê thuế tính theo bậc test ok
            <Route path="/production" element={<ProductionManagement />} /> // ok test
            <Route path="/employee-production" element={<EmployeeProductionInput />} /> //sản lượng của từng Emp theo tháng test ok
            <Route path="/attendance" element={<AttendanceManagement />} /> // bảng chấm công test ok
            <Route path="/leave-request" element={<LeaveRequestManagement />} /> // xin nghỉ phép test oko

            {/*bỏ qua không xài <Route path="/production-line" element={<ProductionLineManagement />} /> */}

            <Route path="/:payrollId/approve" element={<PayrollApproval />} />
            <Route path="/:payrollId" element={<PayrollDetail />} />
            <Route path="*" element={<Navigate to="/payroll" replace />} />
        </Routes>
    );
};

export default PayrollRouter;