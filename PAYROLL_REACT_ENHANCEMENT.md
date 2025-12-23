# React Frontend Enhancement - OT1/OT2 Display Implementation

## File: Enhanced PayrollDetail.js

```javascript
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Col, Modal, Row, Spinner, Table, Badge, Nav, Tab } from 'react-bootstrap';
import payrollService from '../../services/moduleC/payrollService';

const PayrollDetail = () => {
    const { payrollId } = useParams();
    const navigate = useNavigate();

    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (payrollId) {
            fetchPayrollDetail(payrollId);
        }
    }, [payrollId]);

    const fetchPayrollDetail = async (id) => {
        try {
            setLoading(true);
            setError('');

            const response = await payrollService.getPayrollDetail(id);
            const data = response?.data || response;
            setPayroll(data);
        } catch (err) {
            console.error('Error load payroll detail:', err);
            setError(err.response?.data?.message || 'Cannot load payroll detail. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (!value) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatNumber = (value) => {
        if (!value) return '0';
        return parseFloat(value).toFixed(2);
    };

    const formatMonth = (monthStr) => {
        if (!monthStr) return '';
        return new Date(monthStr).toLocaleDateString('vi-VN', {
            month: 'long',
            year: 'numeric'
        });
    };

    const handleRowClick = (emp) => {
        setSelectedEmployee(emp);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedEmployee(null);
    };

    const statusVariant = (status) => {
        if (!status) return 'secondary';
        switch (status.toLowerCase()) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'danger';
            default:
                return 'warning';
        }
    };

    if (loading) {
        return (
            <div className="text-center p-5">
                <Spinner animation="border" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <Button variant="link" onClick={() => navigate(-1)}>← Back</Button>
                <p className="text-danger mt-3">{error}</p>
            </div>
        );
    }

    if (!payroll) {
        return null;
    }

    const employees = payroll.employeePayrolls || [];

    const totalNetPay = employees.reduce(
        (sum, e) => sum + (Number(e.totalPay) || 0),
        0
    );

    return (
        <div className="p-4 payroll-detail-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h3>Payroll Details</h3>
                    <small className="text-muted">
                        Department: {payroll.departmentName || 'N/A'} | Month: {formatMonth(payroll.month)}
                    </small>
                </div>
                <div className="d-flex gap-2">
                    <Badge bg={statusVariant(payroll.status)}>
                        {payroll.status || 'N/A'}
                    </Badge>
                    <Button variant="outline-secondary" onClick={() => navigate(-1)}>
                        Back to Payroll List
                    </Button>
                </div>
            </div>

            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <h6>Total Salary</h6>
                            <h4>{formatCurrency(payroll.totalSalary)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <h6>Employees</h6>
                            <h4>{employees.length}</h4>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm">
                        <Card.Body>
                            <h6>Total Net (per employee)</h6>
                            <h4>{formatCurrency(totalNetPay)}</h4>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0">Employee Payroll List</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    {employees.length === 0 ? (
                        <div className="p-3 text-muted">No employee data.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Emp ID</th>
                                        <th>Full Name</th>
                                        <th className="text-end">Base Salary</th>
                                        <th className="text-end">Allowance</th>
                                        <th className="text-end">Product Bonus</th>
                                        <th className="text-end">OT1 (1.5x)</th>
                                        <th className="text-end">OT2 (2.0x)</th>
                                        <th className="text-end">Total OT</th>
                                        <th className="text-end text-danger">Deductions</th>
                                        <th className="text-end text-danger">Personal Income Tax</th>
                                        <th className="text-end text-bg-primary">Net Pay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map(emp => {
                                        // Calculate OT pay for each type
                                        const hourlyRate = emp.baseSalary / 176;
                                        const ot1Pay = (emp.otWeekdayHours || 0) * hourlyRate * 1.5;
                                        const ot2Pay = (emp.otHolidayHours || 0) * hourlyRate * 2.0;

                                        return (
                                            <tr
                                                key={emp.employeePayrollId}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleRowClick(emp)}
                                            >
                                                <td><strong>{emp.employeeCode}</strong></td>
                                                <td>{emp.fullName}</td>
                                                <td className="text-end">{formatCurrency(emp.baseSalary)}</td>
                                                <td className="text-end">{formatCurrency(emp.allowance)}</td>
                                                <td className="text-end">{formatCurrency(emp.productBonus)}</td>
                                                <td className="text-end text-info">{formatCurrency(ot1Pay)}</td>
                                                <td className="text-end text-warning">{formatCurrency(ot2Pay)}</td>
                                                <td className="text-end">{formatCurrency(emp.overtimePay)}</td>
                                                <td className="text-end text-danger">{formatCurrency(emp.deduction)}</td>
                                                <td className="text-end text-danger">{formatCurrency(emp.personalIncomeTax)}</td>
                                                <td className="text-end text-bg-primary">
                                                    <strong>{formatCurrency(emp.totalPay)}</strong>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Modal for single employee details */}
            <Modal show={showModal} onHide={handleCloseModal} size="xl" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Employee Salary Details
                        {selectedEmployee && ` - ${selectedEmployee.fullName} (${selectedEmployee.employeeCode})`}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEmployee && (
                        <Tab.Container defaultActiveKey="summary">
                            <Nav variant="tabs" className="mb-3">
                                <Nav.Item>
                                    <Nav.Link eventKey="summary">Summary</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="breakdown">Salary Breakdown</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="tax">Tax Calculation</Nav.Link>
                                </Nav.Item>
                                <Nav.Item>
                                    <Nav.Link eventKey="details">Details</Nav.Link>
                                </Nav.Item>
                            </Nav>

                            <Tab.Content>
                                {/* TAB 1: SUMMARY */}
                                <Tab.Pane eventKey="summary">
                                    <Row className="mb-3">
                                        <Col md={6}>
                                            <h6>General Information</h6>
                                            <p><strong>Emp ID:</strong> {selectedEmployee.employeeCode}</p>
                                            <p><strong>Full Name:</strong> {selectedEmployee.fullName}</p>
                                            <p><strong>Salary Type:</strong> {selectedEmployee.salaryType || 'N/A'}</p>
                                            <p><strong>Note:</strong> {selectedEmployee.note || 'N/A'}</p>
                                        </Col>
                                        <Col md={6}>
                                            <h6>Work Information</h6>
                                            <p><strong>Work Days:</strong> {selectedEmployee.totalWorkDays || 0}</p>
                                            <p><strong>Overtime Hours:</strong> {formatNumber(selectedEmployee.totalOvertimeHours || 0)}</p>
                                            <p><strong>Production Quantity:</strong> {selectedEmployee.totalProductionQuantity || 0}</p>
                                        </Col>
                                    </Row>

                                    <Row>
                                        <Col md={6}>
                                            <h6>Income</h6>
                                            <Table size="sm" borderless>
                                                <tbody>
                                                    <tr>
                                                        <td>Base Salary</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.baseSalary)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Allowance</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.allowance)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Product Bonus</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.productBonus)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Overtime Pay</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.overtimePay)}</td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Col>
                                        <Col md={6}>
                                            <h6>Deductions & Tax</h6>
                                            <Table size="sm" borderless>
                                                <tbody>
                                                    <tr>
                                                        <td>Other Deductions</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.deduction)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Family Deduction</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.taxDeductionTotal)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Personal Income Tax</td>
                                                        <td className="text-end">{formatCurrency(selectedEmployee.personalIncomeTax)}</td>
                                                    </tr>
                                                    <tr className="bg-light">
                                                        <td><strong>Net Pay</strong></td>
                                                        <td className="text-end">
                                                            <strong>{formatCurrency(selectedEmployee.totalPay)}</strong>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </Table>
                                        </Col>
                                    </Row>
                                </Tab.Pane>

                                {/* TAB 2: SALARY BREAKDOWN */}
                                <Tab.Pane eventKey="breakdown">
                                    <div className="mb-4">
                                        <h6>Working Days Calculation</h6>
                                        <Table size="sm" bordered>
                                            <tbody>
                                                <tr>
                                                    <td>Standard Working Days/Month</td>
                                                    <td className="text-end">26 days</td>
                                                </tr>
                                                <tr>
                                                    <td>Approved Leave Days</td>
                                                    <td className="text-end">{formatNumber(selectedEmployee.approvedLeaveDays || 0)} days</td>
                                                </tr>
                                                <tr className="bg-light">
                                                    <td><strong>Actual Working Days</strong></td>
                                                    <td className="text-end"><strong>{formatNumber(selectedEmployee.actualWorkingDays || 0)} days</strong></td>
                                                </tr>
                                                <tr className="bg-light">
                                                    <td><strong>Regular Hours</strong></td>
                                                    <td className="text-end"><strong>{formatNumber(selectedEmployee.regularHours || 0)} hours</strong></td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>

                                    <div className="mb-4">
                                        <h6>Overtime Hours Breakdown</h6>
                                        <Row>
                                            <Col md={6}>
                                                <Card className="bg-info bg-opacity-10">
                                                    <Card.Body>
                                                        <h6 className="text-info">OT1: Weekday Overtime</h6>
                                                        <p className="mb-1"><strong>Hours:</strong> {formatNumber(selectedEmployee.otWeekdayHours || 0)} hours</p>
                                                        <p className="mb-1"><strong>Rate:</strong> 1.5x multiplier</p>
                                                        <p className="mb-0"><strong>Pay:</strong> {formatCurrency((selectedEmployee.otWeekdayHours || 0) * (selectedEmployee.baseSalary / 176) * 1.5)}</p>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                            <Col md={6}>
                                                <Card className="bg-warning bg-opacity-10">
                                                    <Card.Body>
                                                        <h6 className="text-warning">OT2: Holiday/Sunday Overtime</h6>
                                                        <p className="mb-1"><strong>Hours:</strong> {formatNumber(selectedEmployee.otHolidayHours || 0)} hours</p>
                                                        <p className="mb-1"><strong>Rate:</strong> 2.0x multiplier</p>
                                                        <p className="mb-0"><strong>Pay:</strong> {formatCurrency((selectedEmployee.otHolidayHours || 0) * (selectedEmployee.baseSalary / 176) * 2.0)}</p>
                                                    </Card.Body>
                                                </Card>
                                            </Col>
                                        </Row>
                                    </div>

                                    <div>
                                        <h6>Attendance & Penalties</h6>
                                        <Table size="sm" borderless>
                                            <tbody>
                                                <tr>
                                                    <td>Late Days</td>
                                                    <td className="text-end">{selectedEmployee.lateCount || 0} days</td>
                                                </tr>
                                                <tr>
                                                    <td>Late Penalty (50,000 VND/day)</td>
                                                    <td className="text-end">{formatCurrency((selectedEmployee.lateCount || 0) * 50000)}</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </Tab.Pane>

                                {/* TAB 3: TAX CALCULATION */}
                                <Tab.Pane eventKey="tax">
                                    <div className="mb-4">
                                        <h6>Tax Computation</h6>
                                        <Table size="sm" bordered>
                                            <tbody>
                                                <tr>
                                                    <td><strong>Gross Income (Before Deductions)</strong></td>
                                                    <td className="text-end"><strong>{formatCurrency(selectedEmployee.baseSalary + (selectedEmployee.allowance || 0) + (selectedEmployee.overtimePay || 0) + (selectedEmployee.productBonus || 0))}</strong></td>
                                                </tr>
                                                <tr className="bg-light">
                                                    <td className="text-muted">Personal Deduction</td>
                                                    <td className="text-end text-muted">-15,500,000 ₫</td>
                                                </tr>
                                                <tr>
                                                    <td>Insurance (10.5%)</td>
                                                    <td className="text-end">{formatCurrency((selectedEmployee.baseSalary * 0.105))}</td>
                                                </tr>
                                                <tr>
                                                    <td>Family Deduction</td>
                                                    <td className="text-end">{formatCurrency(selectedEmployee.taxDeductionTotal || 0)}</td>
                                                </tr>
                                                <tr className="bg-light">
                                                    <td><strong>Taxable Income</strong></td>
                                                    <td className="text-end"><strong>{formatCurrency(selectedEmployee.taxableIncome || 0)}</strong></td>
                                                </tr>
                                                <tr className="table-danger">
                                                    <td><strong>Personal Income Tax (TNCN)</strong></td>
                                                    <td className="text-end"><strong>{formatCurrency(selectedEmployee.personalIncomeTax)}</strong></td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </Tab.Pane>

                                {/* TAB 4: DETAILS */}
                                <Tab.Pane eventKey="details">
                                    <h6>Additional Information</h6>
                                    <Table size="sm" borderless>
                                        <tbody>
                                            <tr>
                                                <td>Wage Coefficient</td>
                                                <td className="text-end">{formatNumber(selectedEmployee.wageCoefficient || 1)}</td>
                                            </tr>
                                            <tr>
                                                <td>Salary Weight</td>
                                                <td className="text-end">{formatNumber(selectedEmployee.weight || 0)}</td>
                                            </tr>
                                            <tr>
                                                <td>Total Deduction</td>
                                                <td className="text-end">{formatCurrency(selectedEmployee.deduction)}</td>
                                            </tr>
                                            <tr>
                                                <td>Calculation Note</td>
                                                <td className="text-end"><small>{selectedEmployee.calculationNote || 'N/A'}</small></td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </Tab.Pane>
                            </Tab.Content>
                        </Tab.Container>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseModal}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default PayrollDetail;
```

---

## File: PayrollList.jsx - Add OT1/OT2 Display

```javascript
// In the table header, add:
<th className="text-end">OT1 (1.5x)</th>
<th className="text-end">OT2 (2.0x)</th>

// In the table body, add:
{payrolls.map(payroll => (
    <tr key={payroll.id}>
        {/* ... existing columns ... */}
        <td className="text-end text-info">
            {formatCurrency((payroll.otWeekdayHours || 0) * (payroll.baseSalary / 176) * 1.5)}
        </td>
        <td className="text-end text-warning">
            {formatCurrency((payroll.otHolidayHours || 0) * (payroll.baseSalary / 176) * 2.0)}
        </td>
    </tr>
))}
```

---

## Expected Data Structure from Backend

The `TbEmployeePayroll` entity should include:

```java
@Entity
@Table(name = "tbEmployeePayroll")
public class TbEmployeePayroll {
    // ... existing fields ...
    
    // NEW FIELDS FOR OT DISPLAY
    @Column(name = "ot_weekday_hours")
    private BigDecimal otWeekdayHours;      // Hours of OT on weekdays
    
    @Column(name = "ot_holiday_hours")
    private BigDecimal otHolidayHours;      // Hours of OT on holidays/Sundays
    
    @Column(name = "working_days")
    private BigDecimal workingDays;         // Actual working days after leave
    
    @Column(name = "approved_leave_days")
    private BigDecimal approvedLeaveDays;   // Number of approved leave days
    
    @Column(name = "regular_hours")
    private BigDecimal regularHours;        // 8 * working_days
    
    @Column(name = "late_count")
    private Integer lateCount;              // Number of late days
}
```

---

## Stylesheet Enhancement (Optional)

```css
/* Add to your CSS file for better visual distinction */

.table-info td, .table-info th {
    background-color: #cfe2ff !important;
    color: #084298 !important;
}

.table-warning td, .table-warning th {
    background-color: #fff3cd !important;
    color: #664d03 !important;
}

.text-info {
    color: #084298 !important;
}

.text-warning {
    color: #ff9800 !important;
}

/* Card styling for OT breakdown */
.card.bg-info {
    border-left: 4px solid #084298;
}

.card.bg-warning {
    border-left: 4px solid #ff9800;
}
```

---

## Notes

1. **OT1 vs OT2 Visual Distinction**:
   - OT1 (Weekday): Blue color, 1.5x multiplier
   - OT2 (Holiday/Sunday): Orange/Yellow color, 2.0x multiplier

2. **Calculation**:
   - Hourly Rate = BaseSalary / 176
   - OT1 Pay = OT1 Hours × Hourly Rate × 1.5
   - OT2 Pay = OT2 Hours × Hourly Rate × 2.0

3. **Backend Requirement**:
   - Must return `otWeekdayHours` and `otHolidayHours` in the payroll response
   - These are already calculated in `PayrollCalculationServiceImp`
   - Need to persist in `TbEmployeePayroll` table

4. **Mobile (Flutter) Display**:
   - Similar tabbed view or expandable cards
   - Display OT1/OT2 hours and pay separately
   - Show calculation formula for transparency
