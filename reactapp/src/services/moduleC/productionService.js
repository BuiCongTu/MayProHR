import { axiosInstance } from '../api';

const API_BASE = '/production';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

// List sản lượng (filter theo department, fromDate, toDate)
export const getProductions = async (filters = {}) =>
{
    try
    {
        const params = {};
        if (filters.departmentId) params.departmentId = filters.departmentId;
        if (filters.fromDate) params.fromDate = filters.fromDate;
        if (filters.toDate) params.toDate = filters.toDate;

        const response = await axiosInstance.get(API_BASE, { params });
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching productions:', error);
        throw error;
    }
};

export const createProduction = async (payload) =>
{
    try
    {
        const response = await axiosInstance.post(API_BASE, payload);
        return extractData(response);
    } catch (error)
    {
        console.error('Error creating production:', error);
        throw error;
    }
};

export const updateProduction = async (id, payload) =>
{
    try
    {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, payload);
        return extractData(response);
    } catch (error)
    {
        console.error('Error updating production:', error);
        throw error;
    }
};

export const deleteProduction = async (id) =>
{
    try
    {
        const response = await axiosInstance.delete(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error deleting production:', error);
        throw error;
    }
};