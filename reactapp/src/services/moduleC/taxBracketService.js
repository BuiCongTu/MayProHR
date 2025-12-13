import { axiosInstance } from '../api';

const API_BASE = '/tax-bracket';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

export const getTaxBrackets = async (active) =>
{
    try
    {
        const params = {};
        if (active !== undefined && active !== null) params.active = active;

        const response = await axiosInstance.get(API_BASE, { params });
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching tax brackets:', error);
        throw error;
    }
};

export const createTaxBracket = async (bracket) =>
{
    try
    {
        const response = await axiosInstance.post(API_BASE, bracket);
        return extractData(response);
    } catch (error)
    {
        console.error('Error creating tax bracket:', error);
        throw error;
    }
};

export const updateTaxBracket = async (id, bracket) =>
{
    try
    {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, bracket);
        return extractData(response);
    } catch (error)
    {
        console.error('Error updating tax bracket:', error);
        throw error;
    }
};

export const deleteTaxBracket = async (id) =>
{
    try
    {
        const response = await axiosInstance.delete(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error deleting tax bracket:', error);
        throw error;
    }
};