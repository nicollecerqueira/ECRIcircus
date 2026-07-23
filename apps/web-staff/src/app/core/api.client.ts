import axios from 'axios';

/**
 * Single axios instance (Avenir `apiClient`). Base URL points at the API's
 * versioned REST surface; in dev Vite proxies /api → :3000.
 * Interceptors are attached in auth.interceptor.ts.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});
