import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { apiClient } from './api.client';
import { type SessionUser, useAuthStore } from './auth.store';

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

let refreshing: Promise<string | null> | null = null;

async function refreshOnce(): Promise<string | null> {
  const { refreshToken, setSession, clear } = useAuthStore.getState();
  if (!refreshToken) {
    return null;
  }
  try {
    const { data } = await axios.post<RefreshResponse>('/api/v1/auth/refresh', { refreshToken });
    setSession(data);
    return data.accessToken;
  } catch {
    clear();
    return null;
  }
}

/**
 * Sessão irrecuperável (sem refresh token, ou refresh recusado): leva ao login.
 *
 * Sem isto o painel da cozinha ficava parado com erro de carregamento, sem dizer
 * que o problema era a sessão — o guard de rota só roda em navegação, e o KDS é
 * um quiosque que fica horas na mesma tela sem ninguém navegar.
 *
 * Navegação DURA (não o router): os tokens só existem em memória, então recarregar
 * é o jeito de garantir que não sobrou estado de uma sessão morta.
 */
function goToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname.startsWith('/login')) {
    return;
  }
  window.location.assign(`/login?redirect=${encodeURIComponent(pathname + search)}`);
}

/** Bearer injection + transparent 401 refresh-and-retry. Never a login wall mid-service. */
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
      // O próprio login/refresh fica de fora: 401 ali é senha errada, e mandar
      // para o login quem já está no login viraria recarga infinita.
      const isAuthCall = original?.url?.startsWith('/auth/') ?? false;
      if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
        original._retried = true;
        refreshing ??= refreshOnce().finally(() => {
          refreshing = null;
        });
        const newToken = await refreshing;
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(original);
        }
        goToLogin();
      }
      return Promise.reject(error);
    },
  );
}
