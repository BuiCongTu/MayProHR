import { axiosInstance } from '../api';

const API_BASE = '/leave-request';

const extractData = (response) =>
{
  if (response.data && response.data.data !== undefined)
  {
    return response.data.data;
  }
  return response.data;
};
export const confirmLeaveRequest = async (id) =>
{
    const response = await axiosInstance.put(`${API_BASE}/${id}/confirm`);
    return extractData(response);
};

export const approveLeaveRequest = async (id) =>
{
    const response = await axiosInstance.put(`${API_BASE}/${id}/approve`);
    return extractData(response);
};

export const rejectLeaveRequest = async (id, rejectReason) =>
{
    const response = await axiosInstance.put(`${API_BASE}/${id}/reject`, { rejectReason });
    return extractData(response);
};


// Get all leave requests
export const getAllLeaveRequests = async (filters = {}) =>
{
  try
  {
    const params = {};
    if (filters.userId) params.userId = filters.userId;
    if (filters.status) params.status = filters.status;

    const response = await axiosInstance.get(API_BASE, { params });
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching leave requests:', error);
    throw error;
  }
};

// Get leave request by ID
export const getLeaveRequestById = async (id) =>
{
  try
  {
    const response = await axiosInstance.get(`${API_BASE}/${id}`);
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching leave request:', error);
    throw error;
  }
};

// Create leave request
export const createLeaveRequest = async (payload) =>
{
  try
  {
    const response = await axiosInstance.post(API_BASE, payload);
    return extractData(response);
  } catch (error)
  {
    console.error('Error creating leave request:', error);
    throw error;
  }
};

// Update leave request
export const updateLeaveRequest = async (id, payload) =>
{
  try
  {
    const response = await axiosInstance.put(`${API_BASE}/${id}`, payload);
    return extractData(response);
  } catch (error)
  {
    console.error('Error updating leave request:', error);
    throw error;
  }
};

// Delete leave request
export const deleteLeaveRequest = async (id) =>
{
  try
  {
    const response = await axiosInstance.delete(`${API_BASE}/${id}`);
    return extractData(response);
  } catch (error)
  {
    console.error('Error deleting leave request:', error);
    throw error;
  }
};

export const getLeaveRequestsByUser = async (userId, fromDate, toDate) =>
{
  try
  {
    const params = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;

    const response = await axiosInstance.get(`${API_BASE}/by-user/${userId}`, { params });
    return extractData(response);
  } catch (error)
  {
    console.error('Error fetching leave requests by user:', error);
    throw error;
  }
};

export const getAllLeaveRequestsSimple = async () =>
{
  try
  {
    const response = await axiosInstance.get(API_BASE);
    const data = extractData(response);
    console.log('[leaveRequestService] getAllLeaveRequestsSimple returned:', Array.isArray(data) ? data.length : 0, 'records');
    return Array.isArray(data) ? data : [];
  } catch (error)
  {
    console.error('[leaveRequestService] Error fetching all leave requests:', error);
    return [];
  }
};

export const getLeaveRequestsByMonth = async (month, departmentId, userId = null) =>
{
  try
  {
    const params = { month, departmentId };
    if (userId) params.userId = userId;

    const response = await axiosInstance.get(`${API_BASE}/by-month`, { params });
    const data = extractData(response);
    console.log('[leaveRequestService] getLeaveRequestsByMonth returned:',
      Array.isArray(data) ? data.length : (Array.isArray(data?.data) ? data.data.length : 0),
      'records');
    return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
  } catch (error)
  {
    console.error('[leaveRequestService] getLeaveRequestsByMonth error:', error.response?.data || error.message);
    throw error;
  }
};
