import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import { axiosInstance } from '../../services/api';
import '../../styles/payroll.css';

const PayrollReport = () =>
{
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [filterMonth, setFilterMonth] = useState(null);
    const [filterDepartment, setFilterDepartment] = useState('');
    const [departments, setDepartments] = useState([]);
    const [exportLoading, setExportLoading] = useState(false);

    useEffect(() =>
    {
        fetchDepartments();
        fetchReport();
    }, []);

    useEffect(() =>
    {
        if (filterYear)
        {
            fetchReport();
        }
    }, [filterYear, filterMonth, filterDepartment]);

    const fetchDepartments = async () =>
    {
        try
        {
            const response = await axiosInstance.get('/department');
            let depts = [];
            if (Array.isArray(response.data))
            {
                depts = response.data;
            } else if (response.data.data && Array.isArray(response.data.data))
            {
                depts = response.data.data;
            }
            setDepartments(depts || []);
        } catch (err)
        {
            console.error('Loading fail:', err);
        }
    };

    const fetchReport = async () =>
    {
        try
        {
            setLoading(true);
            setError('');

            const params = {};
            if (filterYear) params.year = filterYear;
            if (filterMonth) params.month = filterMonth;
            if (filterDepartment) params.departmentId = filterDepartment;

            const response = await axiosInstance.get('/payroll/report', { params });

            // Handle both response formats
            let data = [];
            if (response.data.success === false)
            {
                setError(response.data.message || 'Failed to load report');
            } else if (response.data.data)
            {
                data = response.data.data || [];
            } else if (Array.isArray(response.data))
            {
                data = response.data;
            }

            setReportData(data);
        } catch (err)
        {
            console.error('Error:', err);
            setError(err.response?.data?.message || 'Cannot load report data. Please try again later.');
        } finally
        {
            setLoading(false);
        }
    };

    const formatCurrency = (value) =>
    {
        if (!value) return '0 đ';
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            maximumFractionDigits: 0
        }).format(value);
    };

    const exportToExcel = async () =>
    {
        try
        {
            setExportLoading(true);

            const workbook = XLSX.utils.book_new();

            const summaryData = [
                ['SALARY REPORT', ''],
                ['Year', filterYear],
                ['Month', filterMonth || 'All'],
                ['Department', filterDepartment || 'All'],
                ['Created Date', new Date().toLocaleDateString('vi-VN')],
                [''],
                ['Total Salary Level', reportData.reduce((sum, r) => sum + (r.totalSalary || 0), 0)],
                ['Total Employees', reportData.length]
            ];

            const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

            // Sheet 2: Chi tiết bảng lương
            if (reportData.length > 0)
            {
                const detailData = [
                    ['Month', 'Department', 'Total Salary', 'Status', 'Created At']
                ];

                reportData.forEach(record =>
                {
                    detailData.push([
                        new Date(record.month).toLocaleDateString('vi-VN', {
                            month: 'long',
                            year: 'numeric'
                        }),
                        record.departmentName,
                        record.totalSalary,
                        record.status,
                        new Date(record.createdDate).toLocaleDateString('vi-VN')
                    ]);
                });

                const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
                XLSX.utils.book_append_sheet(workbook, detailSheet, 'Chi Tiết');

                // Định dạng cột tiền tệ
                detailSheet['C1'].z = '#,##0';
                for (let i = 2; i <= detailData.length; i++)
                {
                    if (detailSheet[`C${i}`])
                    {
                        detailSheet[`C${i}`].z = '#,##0';
                    }
                }
            }

            const fileName = `PayrollReport_${filterYear}${filterMonth ? '_' + filterMonth : ''}`;
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
        } catch (err)
        {
            setError('Error export Excel: ' + err.message);
        } finally
        {
            setExportLoading(false);
        }
    };

    const exportToPDF = async () =>
    {
        try
        {
            setExportLoading(true);

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();

            // Header
            pdf.setFontSize(16);
            pdf.text('PAYROLL REPORT', pageWidth / 2, 15, { align: 'center' });

            // Filter info
            pdf.setFontSize(10);
            let filterText = `Year: ${filterYear}`;
            if (filterMonth) filterText += ` | Month: ${filterMonth}`;
            if (filterDepartment) filterText += ` | Department: ${filterDepartment}`;
            pdf.text(filterText, 15, 25);
            pdf.text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 15, 31);

            // Table
            const tableData = reportData.map(record => [
                new Date(record.month).toLocaleDateString('vi-VN', {
                    month: 'long',
                    year: 'numeric'
                }),
                record.departmentName,
                record.totalSalary.toLocaleString('vi-VN'),
                record.status,
                new Date(record.createdDate).toLocaleDateString('vi-VN')
            ]);

            pdf.autoTable({
                head: [['Month', 'Department', 'Total Salary (VND)', 'Status', 'Creation Date']], body: tableData,
                startY: 37,
                theme: 'grid',
                margin: { left: 15, right: 15 },
                styles: {
                    fontSize: 9,
                    halign: 'left'
                },
                columnStyles: {
                    2: { halign: 'right' }
                }
            });

            // Summary
            const totalSalary = reportData.reduce((sum, r) => sum + r.totalSalary, 0);
            const finalY = pdf.lastAutoTable.finalY + 10;
            pdf.setFontSize(11);
            pdf.text(`Total Salary Level: ${totalSalary.toLocaleString('vi-VN')} VND`, 15, finalY);
            pdf.text(`Total Payroll: ${reportData.length}`, 15, finalY + 7);

            const fileName = `PayrollReport_${filterYear}${filterMonth ? '_' + filterMonth : ''}`;
            pdf.save(`${fileName}.pdf`);
        } catch (err)
        {
            setError('Error export PDF: ' + err.message);
        } finally
        {
            setExportLoading(false);
        }
    };

    const totalSalary = reportData.reduce((sum, r) => sum + (r.totalSalary || 0), 0);

    return (
        <div className="payroll-report-container p-4">
            <h2 className="mb-4"> Payroll Report</h2>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Filters */}
            <Card className="mb-4 shadow-sm">
                <Card.Header className="bg-light">
                    <h6 className="mb-0"> Filters</h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Year</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="2020"
                                    max={new Date().getFullYear()}
                                    value={filterYear}
                                    onChange={(e) => setFilterYear(parseInt(e.target.value))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Month</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    max="12"
                                    value={filterMonth || ''}
                                    onChange={(e) => setFilterMonth(e.target.value ? parseInt(e.target.value) : null)}
                                    placeholder="Tất cả"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Department</Form.Label>
                                <Form.Select
                                    value={filterDepartment}
                                    onChange={(e) => setFilterDepartment(e.target.value)}
                                >
                                    <option value="">All</option>
                                    {departments.map(dept => (
                                        <option key={dept.departmentId} value={dept.departmentId}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>&nbsp;</Form.Label>
                                <Button
                                    variant="outline-secondary"
                                    className="w-100"
                                    onClick={fetchReport}
                                    disabled={loading}
                                >
                                    Refresh Report
                                </Button>
                            </Form.Group>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm bg-primary text-white">
                        <Card.Body className="text-center">
                            <h6>Total Salary Level</h6>
                            <h3>{formatCurrency(totalSalary)}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm bg-info text-white">
                        <Card.Body className="text-center">
                            <h6>Total Payroll</h6>
                            <h3>{reportData.length}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm bg-success text-white">
                        <Card.Body className="text-center">
                            <h6>Approved</h6>
                            <h3>
                                {reportData.filter(r => r.status === 'approved').length}
                            </h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Export Buttons */}
            <div className="mb-4 d-flex gap-2">
                <Button
                    variant="success"
                    onClick={exportToExcel}
                    disabled={exportLoading || reportData.length === 0}
                >
                    Export Excel
                </Button>
                <Button
                    variant="danger"
                    onClick={exportToPDF}
                    disabled={exportLoading || reportData.length === 0}
                >
                    Export PDF
                </Button>
                {exportLoading && <Spinner animation="border" size="sm" className="ms-2" />}
            </div>

            {/* Table */}
            <Card className="shadow-sm">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center p-5">
                            <Spinner animation="border" />
                        </div>
                    ) : reportData.length === 0 ? (
                        <Alert variant="info" className="m-3 mb-0">
                            No data reported
                        </Alert>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table striped hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Month</th>
                                        <th>Department</th>
                                        <th className="text-end">Total Salary</th>
                                        <th>Status</th>
                                        <th>Creation Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.map((record, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <strong>
                                                    {new Date(record.month).toLocaleDateString('vi-VN', {
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </strong>
                                            </td>
                                            <td>{record.departmentName}</td>
                                            <td className="text-end font-weight-bold">
                                                {formatCurrency(record.totalSalary)}
                                            </td>
                                            <td>
                                                <Badge bg={record.status === 'approved' ? 'success' : 'warning'}>
                                                    {record.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                {new Date(record.createdDate).toLocaleDateString('vi-VN')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-light">
                                        <th colSpan="2">Total:</th>
                                        <th className="text-end">
                                            <strong>{formatCurrency(totalSalary)}</strong>
                                        </th>
                                        <th colSpan="2"></th>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default PayrollReport;