import axios from 'axios';
import BASE_API from './api';
import { getCurrentUser } from './authService';

const NOTIFICATION_API = BASE_API + '/notifications';

// Helper function to get the token headers
const getAuthHeaders = () => {
    const user = getCurrentUser();
    if (user && user.token) {
        return { Authorization: `Bearer ${user.token}` };
    }
    return {};
};

export const getMyNotifications = async (page = 0, size = 10) => {
    try {
        const response = await axios.get(`${NOTIFICATION_API}/my`, {
            params: { page, size, sort: 'sentDate,desc' },
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch notifications", error);
        return { content: [] };
    }
};

export const markAsRead = async (id) => {
    try {
        await axios.put(`${NOTIFICATION_API}/${id}/read`, {}, {
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.error("Failed to mark as read", error);
    }
};

export const markAllAsRead = async () => {
    try {
        await axios.put(`${NOTIFICATION_API}/read-all`, {}, {
            headers: getAuthHeaders()
        });
    } catch (error) {
        console.error("Failed to mark all as read", error);
    }
};