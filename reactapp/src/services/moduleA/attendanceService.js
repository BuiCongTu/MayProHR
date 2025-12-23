import axios from 'axios';
import { getToken } from '../authService';

const API_BASE = 'http://localhost:9999/api/attendance';

const getTokenHeader = () =>
{
  const token = getToken();
  return {
    Authorization: token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json'
  };
};

const buildParams = (baseParams = {}, filters = {}) =>
{
    const cleaned = {};
    Object.entries({ ...baseParams, ...filters }).forEach(([k, v]) =>
    {
        if (v !== null && v !== undefined && v !== '') cleaned[k] = v;
    });
    return cleaned;
};


const attendanceService = {
  checkInByFace: async (imageBase64) =>
  {
    const res = await axios.post(
      `${API_BASE}/checkin`,
      { imageBase64 },
      { headers: getTokenHeader() }
    );
    return res.data;
  },

  checkOutByFace: async (imageBase64) =>
  {
    const res = await axios.post(
      `${API_BASE}/checkout`,
      { imageBase64 },
      { headers: getTokenHeader() }
    );
    return res.data;
  },

  getHistory: async (userId, date) =>
  {
    const res = await axios.get(
      `${API_BASE}/history/${userId}`,
      {
        params: date ? { date } : {},
        headers: getTokenHeader()
      }
    );
    return res.data;
  },

  getByMonth: async (month, userId = null, filters ={}) =>
  {
    try
    {
      const res = await axios.get(
        `${API_BASE}/by-month`,
        {
            params: buildParams({ month, userId }, filters),
            headers: getTokenHeader()
        }
      );

      console.log('[attendanceService] getByMonth response:', res.data);

      return Array.isArray(res.data?.data) ? res.data.data : [];
    } catch (error)
    {
      console.error('[attendanceService] getByMonth error:', error.response?.data || error.message);
      throw error;
    }
  },

    getByDate: async (date, userId = null, filters = {}) =>
    {
        const res = await axios.get(
            `${API_BASE}/by-date`,
            {
                params: buildParams({ date, userId }, filters),
                headers: getTokenHeader()
            }
        );
        return Array.isArray(res.data?.data) ? res.data.data : [];
    },

    getByRange: async (startDate, endDate, userId = null, filters = {}) =>
    {
        const res = await axios.get(
            `${API_BASE}/by-range`,
            {
                params: buildParams({ startDate, endDate, userId }, filters),
                headers: getTokenHeader()
            }
        );
        return Array.isArray(res.data?.data) ? res.data.data : [];
    },

    registerFace: async (userId, imageBase64) =>
  {
    const res = await axios.post(
      `${API_BASE}/register-face`,
      { userId: Number(userId), imageBase64 },
      { headers: getTokenHeader() }
    );
    return res.data;
  },

  trainModel: async () =>
  {
    const res = await axios.post(
      `${API_BASE}/train-model`,
      {},
      { headers: getTokenHeader() }
    );
    return res.data;
  }
};

export default attendanceService;
