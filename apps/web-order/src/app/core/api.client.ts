import axios from 'axios';
import { useSession } from './session.store';

/**
 * Single axios instance. Injects the diner's table token (not a JWT) so the API
 * scopes requests to this table's session. Public endpoints (menu/storefront) work
 * even without a token.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = useSession.getState().dinerToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
