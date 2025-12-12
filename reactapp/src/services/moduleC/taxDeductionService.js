import { axiosInstance } from '../api';

const API_BASE = '/tax-deduction';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

export const getTaxDeductions = async (active, type) =>
{
    try
    {
        const params = {};
        if (active !== undefined && active !== null) params.active = active;
        if (type) params.type = type;

        const response = await axiosInstance.get(`${API_BASE}`, { params});
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching tax deductions:', error);
        throw error;
    }
};

//create
export const createTaxDeduction = async (taxDeduction) => {
    try {
        const response = await axiosInstance.post(`${API_BASE}`, taxDeduction);
        return extractData(response);
    } catch (error) {
        console.error('Error creating tax deduction:', error);
        throw error;
    }
};
    // edit
    export const updateTaxDeduction = async (id, taxDeduction) =>
    {
        try
        {
            const response = await axiosInstance.put(`${API_BASE}/${id}`, taxDeduction);
            return extractData(response);
        } catch (error)
        {
            console.error('Error updating tax deduction:', error);
            throw error;
        }
    };

//delete
export const deleteTaxDeduction = async (id) =>
{
    try
    {
        const response = await axiosInstance.delete(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error deleting tax deduction:', error);
    }
};