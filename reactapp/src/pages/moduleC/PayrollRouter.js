
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PayrollDashboard from './PayrollDashboard';
import PayrollList from '../../components/ModuleC/PayrollList';
import PayrollDetail from '../../components/ModuleC/PayrollDetail';
import PayrollApproval from '../../components/ModuleC/PayrollApproval';
import PayrollReport from '../../components/ModuleC/PayrollReport';
import TaxCalculator from '../../components/ModuleC/TaxCalculator';
import CreatePayroll from '../../components/ModuleC/CreatePayroll';
import EmplRecurAllowance from '../../components/ModuleC/EmplRecurAllowance';
import HolidayManagement from "../../components/ModuleC/HolidayManagement";
import TaxDeductionManagement from "../../components/ModuleC/TaxDeductionManagement";
import TaxBracketManagement from "../../components/ModuleC/TaxBracketManagement";
import ProductionManagement from "../../components/ModuleC/ProductionManagement";

const PayrollRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<PayrollDashboard />} />
            <Route path="/list" element={<PayrollList />} />
            <Route path="/create" element={<CreatePayroll />} />
            <Route path="/report" element={<PayrollReport />} />
            <Route path="/tax-calculator" element={<TaxCalculator />} />
            <Route path="/allowances/recurring" element={<EmplRecurAllowance />} />
            <Route path="/holidays" element={<HolidayManagement />} />
            <Route path="/tax-deduction" element={<TaxDeductionManagement />} />
            <Route path="/tax-bracket" element={<TaxBracketManagement />} />
            <Route path="/production" element={<ProductionManagement />} />

            <Route path="/:payrollId/approve" element={<PayrollApproval />} />
            <Route path="/:payrollId" element={<PayrollDetail />} />
            <Route path="*" element={<Navigate to="/payroll" replace />} />
        </Routes>
    );
};

export default PayrollRouter;