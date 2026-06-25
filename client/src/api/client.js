import axios from 'axios';

// In production set VITE_API_URL to the backend origin (e.g. https://xxx.up.railway.app).
// In local dev it's unset, so we fall back to '/api' and let Vite's proxy forward it.
const apiBase = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const api = axios.create({
  baseURL: apiBase,
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
