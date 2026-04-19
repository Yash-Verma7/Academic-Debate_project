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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = String(error?.response?.data?.message || '').toLowerCase();
    const isAuthFailure =
      status === 401 || (status === 404 && message.includes('user not found'));

    if (isAuthFailure) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      const currentPath = window.location.pathname;
      const isPublicAuthRoute =
        currentPath.startsWith('/login') ||
        currentPath.startsWith('/signup') ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/reset-password');

      if (!isPublicAuthRoute) {
        window.location.replace('/login?session=expired');
      }
    }

    return Promise.reject(error);
  }
);

export default api;