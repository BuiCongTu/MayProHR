import React, { useEffect, useState } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import TimeBasedPayrollBreakdown from './TimeBasedPayrollBreakdown';
import ProductBasedPayrollBreakdown from './ProductBasedPayrollBreakdown';
import payrollService from '../../services/moduleC/payrollService';

/**
 * Component wrapper để tự động hiển thị breakdown dựa trên loại lương
 */
const PayrollBreakdownSelector = ({ employeePayrollId, payrollMonth }) => {
  const [salaryType, setSalaryType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSalaryType = async () => {
      try {
        setLoading(true);
        const response = await payrollService.getPayrollBreakdown(employeePayrollId);

        if (response?.data?.success && response.data.data) {
          setSalaryType(response.data.data.salaryType);
        } else {
          setError('Unable to determine salary type');
        }
      } catch (err) {
        setError('Error loading payroll data');
        console.error('PayrollBreakdownSelector error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (employeePayrollId) {
      loadSalaryType();
    }
  }, [employeePayrollId]);

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  // Hiển thị component phù hợp dựa trên loại lương
  if (salaryType === 'TimeBased') {
    return (
      <TimeBasedPayrollBreakdown 
        employeePayrollId={employeePayrollId} 
        payrollMonth={payrollMonth} 
      />
    );
  }

  if (salaryType === 'ProductBased') {
    return (
      <ProductBasedPayrollBreakdown 
        employeePayrollId={employeePayrollId} 
        payrollMonth={payrollMonth} 
      />
    );
  }

  return <Alert variant="warning">Unknown salary type: {salaryType}</Alert>;
};

export default PayrollBreakdownSelector;