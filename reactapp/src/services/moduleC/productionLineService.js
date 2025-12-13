import { axiosInstance } from '../api';

const API_BASE = '/production-line';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

// list production filterr pro id subline
export const getProductionLines = async (filters = {}) =>
{
    try
    {
        const params = {};
        if (filters.productionId) params.productionId = filters.productionId;
        if (filters.sublineId) params.sublineId = filters.sublineId;

        const response = await axiosInstance.get(API_BASE, { params });
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching production lines:', error);
        throw error;
    }
};

export const createProductionLine = async (payload) =>
{
    try
    {
        const response = await axiosInstance.post(API_BASE, payload);
        return extractData(response);
    } catch (error)
    {
        console.error('Error creating production line:', error);
        throw error;
    }
};

export const updateProductionLine = async (id, payload) =>
{
    try
    {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, payload);
        return extractData(response);
    } catch (error)
    {
        console.error('Error updating production line:', error);
        throw error;
    }
};

export const deleteProductionLine = async (id) =>
{
    try
    {
        const response = await axiosInstance.delete(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error deleting production line:', error);
        throw error;
    }
};
