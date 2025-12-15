import axios from 'axios';
import { BASE_API } from './api';
import { getToken } from './authService';

const NOTIFICATION_API = BASE_API + '/notifications';

// Helper function to get the token headers
const getAuthHeaders = () => {
    const token = getToken();
    if (token) {
        return { Authorization: `Bearer ${token}` };
    }
    return null;
};

export const getMyNotifications = async (page = 0, size = 10) => {
    const headers = getAuthHeaders();

    // Safety check
    if (!headers) {
        console.warn("Skipping notification fetch: No token found.");
        return { content: [] };
    }

    try {
        const response = await axios.get(`${NOTIFICATION_API}/my`, {
            params: { page, size, sort: 'sentDate,desc' },
            headers: headers
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch notifications", error);
        return { content: [] };
    }
};

export const markAsRead = async (id) => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
        await axios.put(`${NOTIFICATION_API}/${id}/read`, {}, { headers });
    } catch (error) { console.error(error); }
};

export const markAllAsRead = async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
        await axios.put(`${NOTIFICATION_API}/read-all`, {}, { headers });
    } catch (error) { console.error(error); }
};