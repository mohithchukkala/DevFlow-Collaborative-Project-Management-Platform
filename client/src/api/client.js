import axios from 'axios';

// Single axios instance. The dev server proxies /api to the backend.
const api = axios.create({
  baseURL: '/api',
});

// Attach the JWT from localStorage to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('devflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Surface a clean error message and auto-logout on 401.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Something went wrong';
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('devflow_token');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(new Error(message));
  }
);

export default api;
