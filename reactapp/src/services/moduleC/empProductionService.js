import { axiosInstance } from '../api';

const API_BASE = '/employee-production';

const extractData = (response) =>
{
  if (response.data && response.data.data !== undefined)
  {
    return response.data.data;
  }
  return response.data;
};

// Lấy sản lượng employee trong tháng
export const getEmployeeProductionByMonth = async (userId, month) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/by-employee-month`, {
      params: { userId, month }
    });
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching employee production:', error);
    throw error;
  }
};

// Lấy sản lượng của tất cả employees trong 1 production
export const getEmployeeProductionByProduction = async (productionId) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/by-production/${productionId}`);
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching employee productions:', error);
    throw error;
  }
};

// Lấy sản lượng employees theo bộ phận + tháng
export const getEmployeeProductionByDepartmentMonth = async (departmentId, month) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/by-department-month`, {
      params: { departmentId, month }
    });
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching employee productions:', error);
    throw error;
  }
};

// Tạo/cập nhật sản lượng employee
export const createOrUpdateEmployeeProduction = async (payload) =>
{
  try
  {
    const response = await axiosInstance.post(API_BASE, payload);
    return extractData(response);
  } catch (error)
  {
    console.error('Error creating employee production:', error);
    throw error;
  }
};

// Xóa sản lượng employee
export const deleteEmployeeProduction = async (id) =>
{
  try
  {
    const response = await axiosInstance.delete(`${API_BASE}/${id}`);
    return extractData(response);
  } catch (error)
  {
    console.error('Error deleting employee production:', error);
    throw error;
  }
};

// Lấy tất cả sản lượng của 1 employee
export const getEmployeeProductions = async (userId) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/by-employee/${userId}`);
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching employee production history:', error);
    throw error;
  }
};
