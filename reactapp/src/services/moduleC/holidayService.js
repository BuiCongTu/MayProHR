import {axiosInstance} from "../api";
const API_BASE = '/holiday';

const extractData = (response) =>
{
    if (response.data && response.data.data !== undefined)
    {
        return response.data.data;
    }
    return response.data;
};

export const getHolidays = async (year, month) =>
{
    try
    {
        const params = {};
        if (year) params.year = year;
        if (month) params.month = month;

        const response = await axiosInstance.get(API_BASE, { params });
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching holidays:', error);
        throw error;
    }
};

export const getHolidayById = async (id) =>
{
    try
    {
        const response = await axiosInstance.get(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error fetching holiday:', error);
        throw error;
    }
};

export const createHoliday = async (holiday) =>
{
    try
    {
        const response = await axiosInstance.post(API_BASE, holiday);
        return extractData(response);
    } catch (error)
    {
        console.error('Error creating holiday:', error);
        throw error;
    }
};

export const updateHoliday = async (id, holiday) =>
{
    try
    {
        const response = await axiosInstance.put(`${API_BASE}/${id}`, holiday);
        return extractData(response);
    } catch (error)
    {
        console.error('Error updating holiday:', error);
        throw error;
    }
};

export const deleteHoliday = async (id) =>
{
    try
    {
        const response = await axiosInstance.delete(`${API_BASE}/${id}`);
        return extractData(response);
    } catch (error)
    {
        console.error('Error deleting holiday:', error);
        throw error;
    }
};
