import { axiosInstance } from '../api';

const API_BASE = '/payroll';
const API_DEPT = '/lines/department';
const API_LINES = '/lines';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

//Tính lương đầy đủ cho 1 nhân viên
export const calculateEmployeeSalary = async (userId, month, allowance = 0) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/calculate-salary`,
            {
                params: { userId, month, allowance }
            }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error calculating salary:', error);
        throw error;
    }
};

//Tính thuế TNCN cho nhân viên
export const calculatePersonalIncomeTax = async (userId, grossIncome, month) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/calculate-tax`,
            {
                params: { userId, grossIncome, month }
            }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error calculating tax:', error);
        throw error;
    }
};
//Lấy hồ sơ thuế của nhân viên

export const getEmployeeTaxProfile = async (userId) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/employee-tax-profile`,
            { params: { userId } }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching tax profile:', error);
        throw error;
    }
};

//Cập nhật hồ sơ thuế (HR chỉnh số người phụ thuộc)
export const updateEmployeeTaxProfile = async (userId, numberOfDependents) =>
{
    try
    {
        const response = await axiosInstance.put(
            `${API_BASE}/employee-tax-profile`,
            {},
            { params: { userId, numberOfDependents } }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error updating tax profile:', error);
        throw error;
    }
};

//Tạo bảng lương cho bộ phận
export const generatePayroll = async (departmentId, month, allowance = 0) =>
{
    try
    {
        const response = await axiosInstance.post(
            `${API_BASE}/generate`,
            { departmentId, month, allowance }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error generating payroll:', error);
        throw error;
    }
};

//Xem trước bảng lương
export const previewPayroll = async (departmentId, month) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/preview`,
            { params: { departmentId, month } }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error previewing payroll:', error);
        throw error;
    }
};

//Lấy chi tiết bảng lương
export const getPayrollDetail = async (payrollId) =>
{
    try
    {
        const response = await axiosInstance.get(`${API_BASE}/${payrollId}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching payroll detail:', error);
        throw error;
    }
};

//Lấy danh sách bảng lương
export const getPayrollList = async (month, departmentId) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/list`,
            { params: { month, departmentId } }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching payroll list:', error);
        throw error;
    }
};

//Phê duyệt bảng lương (Factory Director)
export const approvePayroll = async (payrollId, approverNote) =>
{
    try
    {
        const response = await axiosInstance.post(
            `${API_BASE}/${payrollId}/approve`,
            { approverNote }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error approving payroll:', error);
        throw error;
    }
};

//Từ chối bảng lương
export const rejectPayroll = async (payrollId, rejectReason) =>
{
    try
    {
        const response = await axiosInstance.post(
            `${API_BASE}/${payrollId}/reject`,
            { rejectReason }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error rejecting payroll:', error);
        throw error;
    }
};

//Nhập dữ liệu sản xuất
export const submitProductionData = async (departmentId, productCount, dop, unitPrice) =>
{
    try
    {
        const response = await axiosInstance.post(
            `${API_BASE}/production/submit`,
            { departmentId, productCount, dop, unitPrice }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error submitting production data:', error);
        throw error;
    }
};

//Lấy dữ liệu sản xuất theo tháng
export const getProductionData = async (departmentId, month) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/production/list`,
            { params: { departmentId, month } }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching production data:', error);
        throw error;
    }
};

//Lấy báo cáo lương
export const getPayrollReport = async (filters) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/report`,
            { params: filters }
        );
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching payroll report:', error);
        throw error;
    }
};

//Export báo cáo lương to Excel
export const exportPayrollToExcel = async (filters) =>
{
    try
    {
        const response = await axiosInstance.get(
            `${API_BASE}/export`,
            { params: filters, responseType: 'blob' }
        );

        // Tạo link download
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `payroll_${new Date().getTime()}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.parentURL.removeChild(link);
    } catch (error)
    {
        console.error('Error exporting payroll:', error);
        throw error;
    }
};

//Lấy tất cả lines của 1 department
export const getDepartmentLines = async (departmentId) =>
{
    try
    {
        const response = await axiosInstance.get(`${API_DEPT}/${departmentId}`);
        return extractData(response) || response.data;
    } catch (error)
    {
        console.error('Error fetching department lines:', error);
        throw error;
    }
};

// Lấy children lines (sub-lines)
export const getChildLines = async (parentLineId) =>
{
    try
    {
        const response = await axiosInstance.get(`${API_LINES}/children/${parentLineId}`);
        return extractData(response) || response.data;
    } catch (error)
    {
        console.error('Error fetching child lines:', error);
        throw error;
    }
};

export default {
    calculateEmployeeSalary,
    calculatePersonalIncomeTax,
    getEmployeeTaxProfile,
    updateEmployeeTaxProfile,
    generatePayroll,
    previewPayroll,
    getPayrollDetail,
    getPayrollList,
    approvePayroll,
    rejectPayroll,
    submitProductionData,
    getProductionData,
    getPayrollReport,
    exportPayrollToExcel,
    getDepartmentLines,
    getChildLines
};