import { useMutation } from '@tanstack/react-query';
import { apiClient } from './api.client';
import { type SessionUser, useAuthStore } from './auth.store';

// KDS is reachable by kitchen line and managers only.
const KDS_ROLES = ['kitchen', 'location_manager', 'brand_owner'];

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function canUseKds(): boolean {
  const role = useAuthStore.getState().user?.role;
  return !!role && KDS_ROLES.includes(role);
}

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().accessToken;
}

export function logout() {
  useAuthStore.getState().clear();
}

export async function refreshSession(): Promise<boolean> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    return false;
  }
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
    setSession(data);
    return true;
  } catch {
    clear();
    return false;
  }
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', creds);
      return data;
    },
    onSuccess: (data) => setSession(data),
  });
}
