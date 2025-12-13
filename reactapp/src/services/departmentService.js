import axios from 'axios';
import BASE_API from './api';

const DEPARTMENT_API = '/department';
const LINE_API = '/lines';

export async function getAllDepartments()
{
    const API_URL = BASE_API + DEPARTMENT_API;
    try
    {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (err)
    {
        console.error("Failed to fetch departments:", err);
        throw err;
    }
}

export async function getLinesByDepartment(deptId)
{
    // Endpoint: /api/lines/department/{deptId}
    const API_URL = `${BASE_API}${LINE_API}/department/${deptId}`;
    try
    {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (err)
    {
        console.error("Failed to fetch lines:", err);
        return [];
    }
}