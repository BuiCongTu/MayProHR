import axios from 'axios';

export const getAllLeaveReasons = async () => {
    const res = await axios.get('/api/leave-reason');
    return res.data.data || [];
};
