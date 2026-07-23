import { useMutation } from '@tanstack/react-query';
import { apiClient } from './api.client';
import { type SessionUser, useAuthStore } from './auth.store';

/**
 * Session state + login/refresh/logout + hasPermission/hasRole.
 * Angular injectable auth service → this module + the zustand auth.store.
 *
 * Permissions are derived from the role (mirrors business-rules.md RBAC). Route
 * guard data uses these permission keys.
 */
export type Permission = 'floor' | 'order' | 'pos' | 'admin';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  brand_owner: ['floor', 'order', 'pos', 'admin'],
  location_manager: ['floor', 'order', 'pos', 'admin'],
  waiter: ['floor', 'order'],
  cashier: ['floor', 'pos'],
  kitchen: [],
};

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export function hasRole(...roles: string[]): boolean {
  const role = useAuthStore.getState().user?.role;
  return !!role && roles.includes(role);
}

export function hasPermission(permission: Permission): boolean {
  const role = useAuthStore.getState().user?.role;
  if (!role) {
    return false;
  }
  return (ROLE_PERMISSIONS[role] ?? []).includes(permission);
}

export function isAuthenticated(): boolean {
  return !!useAuthStore.getState().accessToken;
}

export function logout() {
  useAuthStore.getState().clear();
}

/** Called once at bootstrap (provideAppInitializer equivalent). */
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

/** React Query mutation for the login screen. */
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
