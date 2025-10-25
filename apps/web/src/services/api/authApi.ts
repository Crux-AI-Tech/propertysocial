import axios from 'axios';
import { getAuthToken } from '../../utils/auth';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:7500/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authApi = {
  /**
   * Register a new user
   */
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => {
    return api.post('/auth/register', userData);
  },

  /**
   * Login user
   */
  login: (credentials: { email: string; password: string }) => {
    return api.post('/auth/login', credentials);
  },

  /**
   * Logout user
   */
  logout: () => {
    return api.post('/auth/logout');
  },

  /**
   * Get current user
   */
  getCurrentUser: () => {
    return api.get('/auth/me');
  },

  /**
   * Refresh token
   */
  refreshToken: (refreshToken: string) => {
    return api.post('/auth/refresh', { refreshToken });
  },

  /**
   * Verify email
   */
  verifyEmail: (token: string) => {
    return api.post('/auth/verify-email', { token });
  },

  /**
   * Request password reset
   */
  requestPasswordReset: (email: string) => {
    return api.post('/auth/request-password-reset', { email });
  },

  /**
   * Reset password
   */
  resetPassword: (token: string, password: string) => {
    return api.post('/auth/reset-password', { token, password });
  },

  /**
   * Change password
   */
  changePassword: (currentPassword: string, newPassword: string) => {
    return api.post('/auth/change-password', { currentPassword, newPassword });
  },
};

export default api;