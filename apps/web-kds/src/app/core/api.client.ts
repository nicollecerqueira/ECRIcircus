import axios from 'axios';

/** Single axios instance (Avenir apiClient). Dev: Vite proxies /api → :3000. */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});
