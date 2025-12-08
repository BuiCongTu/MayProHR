import axios from 'axios';
import BASE_API from './api';

const USER_API = '/users'; // Sửa lại đúng backend

// Lấy danh sách users theo phòng ban
export async function getUsersByDepartment(deptId) {
    const API_URL = `${BASE_API}${USER_API}/department/${deptId}`;
    try {
        const response = await axios.get(API_URL);
        return response.data?.data || [];
    } catch (err) {
        console.error("Failed to fetch users by department:", err);
        return [];
    }
}

// Lấy thông tin profile của user hiện tại
export const getUserProfile = async () => {
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}/profile`;

    try {
        const response = await axios.get(API_URL, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.data;
    } catch (err) {
        console.error("Failed to fetch user profile:", err);
        throw err;
    }
};

// Cập nhật thông tin profile
export const updateUserProfile = async (userData) => {
    const token = localStorage.getItem('token');
    const API_URL = `${BASE_API}${USER_API}/profile`;

    try {
        const response = await axios.put(API_URL, userData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        return response.data.data;
    } catch (err) {
        console.error("Failed to update user profile:", err);
        throw err;
    }
};
