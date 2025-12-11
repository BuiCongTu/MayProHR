
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PayrollDashboard from './PayrollDashboard';
import PayrollList from './components/PayrollList';
import PayrollDetail from './components/PayrollDetail';
import PayrollApproval from './components/PayrollApproval';
import PayrollReport from './components/PayrollReport';
import TaxCalculator from './components/TaxCalculator';
import CreatePayroll from './components/CreatePayroll';


const PayrollRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<PayrollDashboard />} />
            <Route path="/list" element={<PayrollList />} />
            <Route path="/create" element={<CreatePayroll />} />
            <Route path="/report" element={<PayrollReport />} />
            <Route path="/tax-calculator" element={<TaxCalculator />} />
            <Route path="/:payrollId/approve" element={<PayrollApproval />} />
            <Route path="/:payrollId" element={<PayrollDetail />} />
            <Route path="*" element={<Navigate to="/payroll" replace />} />
        </Routes>
    );
};

export default PayrollRouter;