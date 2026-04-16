import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL;

if (!baseURL) {
  throw new Error('VITE_API_URL is not defined');
}

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;