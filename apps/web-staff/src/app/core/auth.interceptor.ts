import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './api.client';
import { type SessionUser, useAuthStore } from './auth.store';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

// Single in-flight refresh shared by all 401s (avoid a refresh stampede).
let refreshing: Promise<string | null> | null = null;

async function refreshOnce(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }
  try {
    // Bare axios (not apiClient) so this request skips the interceptors below.
    const { data } = await axios.post<RefreshResponse>('/api/v1/auth/refresh', { refreshToken });
    setSession(data);
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

/** Bearer injection + transparent 401 refresh-and-retry (Angular HTTP interceptor). */
export function setupAuthInterceptors() {
  apiClient.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  apiClient.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      if (error.response?.status === 401 && original && !original._retried) {
        original._retried = true;
        refreshing ??= refreshOnce().finally(() => {
          refreshing = null;
        });
        const newToken = await refreshing;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }
      }
      return Promise.reject(error);
    },
  );
}
