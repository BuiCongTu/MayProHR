import axios from 'axios';

// axios config
const BASE_API = '/api';

const axiosInstance = axios.create({
  baseURL: BASE_API
});

axiosInstance.interceptors.request.use(
  config =>
  {
    const token = localStorage.getItem('token');
    if (token)
    {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  response => response,
  error =>
  {
    if (error.response?.status === 401)
    {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Mặc định export axios instance để các service dùng như `api.get(...)`
export default axiosInstance;
export { axiosInstance, BASE_API };
