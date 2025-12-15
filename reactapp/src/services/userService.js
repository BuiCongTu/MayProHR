import axios from 'axios';
import { BASE_API } from './api';

const USER_API = '/user';

// New: search users by organizational structure
export async function getUsersByStructure({ departmentId, lineId, roleId })
{
    if (!departmentId)
    {
        return [];
    }
    const API_URL = `${BASE_API}${USER_API}/search-by-structure`;
    try
    {
        const response = await axios.get(API_URL, {
            params: {
                departmentId,
                lineId: lineId || undefined,
                roleId: roleId || undefined
            }
        });
        const data = response.data;
        // Unwrap common ApiResponse shape {success, data} or return raw array
        return Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    } catch (err)
    {
        console.error('Failed to fetch users by structure:', err);
        return [];
    }
}

// Lấy danh sách users theo phòng ban
export async function getUsersByDepartment(deptId)
{
    const API_URL = `${BASE_API}${USER_API}/department/${deptId}`;
    try
    {
        const response = await axios.get(API_URL);
        return response.data?.data || [];
    } catch (err)
    {
        console.error("Failed to fetch users by department:", err);
        return [];
    }
}

// Search all users with pagination and search term
export const searchUsers = async (searchTerm = '', page = 0, size = 20) => {
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}`;

    try {
        const response = await axios.get(API_URL, {
            params: {
                search: searchTerm,
                page,
                size
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data;
    } catch (err) {
        console.error("Failed to search users:", err);
        throw err;
    }
};

// Get all users (for autocomplete)
export const getAllUsers = async () => {
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}`;

    try {
        const response = await axios.get(API_URL, {
            params: {
                size: 1000 // Get a large number of users for autocomplete
            },
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data?.content || response.data || [];
    } catch (err) {
        console.error("Failed to fetch all users:", err);
        return [];
    }
};

// Get user profile of current user
export const getUserProfile = async () =>
{
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}/profile`;

    try
    {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.data;
    } catch (err)
    {
        console.error("Failed to fetch user profile:", err);
        throw err;
    }
};

// Update user profile
export const updateUserProfile = async (userData) =>
{
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}/profile`;

    try
    {
        const response = await axios.put(API_URL, userData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.data;
    } catch (err)
    {
        console.error("Failed to update user profile:", err);
        throw err;
    }
};

// Get user by ID
export const getUserById = async (userId) => {
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}/${userId}`;

    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = response.data;
        // Unwrap common ApiResponse shape {success, data} or return raw
        return data?.data || data;
    } catch (err) {
        console.error("Failed to fetch user by ID:", err);
        throw err;
    }
};
