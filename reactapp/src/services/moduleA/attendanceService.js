import axios from 'axios';
import { getToken } from '../authService';

const API_BASE = 'http://localhost:9999/api/attendance';

const getTokenHeader = () =>
{
    const token = getToken();
    if (!token)
    {
        throw new Error('Vui lòng đăng nhập lại (token không tồn tại hoặc đã hết hạn)');
    }
    return { Authorization: `Bearer ${token}` };
};

const attendanceService = {
    registerFace: async (userId, imageBase64) =>
    {
        if (!userId || !imageBase64) throw new Error('UserId và imageBase64 là bắt buộc');
        const res = await axios.post(
            `${API_BASE}/register-face`,
            { userId: Number(userId), imageBase64 },
            { headers: { ...getTokenHeader(), 'Content-Type': 'application/json' } }
        );
        return res.data;
    },

    trainModel: async () =>
    {
        const res = await axios.post(
            `${API_BASE}/train-model`,
            {},
            { headers: { ...getTokenHeader(), 'Content-Type': 'application/json' } }
        );
        return res.data;
    }
};

export default attendanceService;