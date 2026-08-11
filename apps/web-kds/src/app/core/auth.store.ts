import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Tempo PARADO que encerra a sessão, contado desde o último toque na tela.
 *
 * ATENÇÃO ao efeito disto num painel de cozinha: ele fica exibido numa TV e
 * passa longos períodos sem ninguém encostar, mesmo com o serviço a todo vapor.
 * Marcar itens como prontos conta como toque e adia o corte; um intervalo maior
 * que dez minutos entre dois toques derruba o login e alguém terá de entrar de
 * novo no meio do evento.
 */
export const INACTIVITY_MS = 10 * 60 * 1000;

/** Um "sinal de vida" gravado a cada 15s, no máximo — o resto é desperdício. */
const TOUCH_THROTTLE_MS = 15_000;

/**
 * Sessão da cozinha.
 *
 * Persistida (antes vivia só em memória, e recarregar a página derrubava o
 * login). O corte por inatividade é o que limita o risco de guardar o token no
 * navegador: sessão parada há mais de dez minutos é descartada na volta.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  lastEmail: string | null;
  /** Último sinal de vida, em epoch ms. */
  lastActivityAt: number;
  setSession: (p: { accessToken: string; refreshToken: string; user: SessionUser }) => void;
  touch: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      lastEmail: null,
      lastActivityAt: 0,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({
          accessToken,
          refreshToken,
          user,
          lastEmail: user.email,
          lastActivityAt: Date.now(),
        }),
      touch: () => {
        const agora = Date.now();
        if (agora - get().lastActivityAt < TOUCH_THROTTLE_MS) {
          return;
        }
        set({ lastActivityAt: agora });
      },
      clear: () => set({ accessToken: null, refreshToken: null, user: null, lastActivityAt: 0 }),
    }),
    {
      name: 'ecri.kds.session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Sessão que passou do tempo de inatividade — não vale mais, nem após recarregar. */
export function sessionExpirada(): boolean {
  const { accessToken, lastActivityAt } = useAuthStore.getState();
  return accessToken !== null && Date.now() - lastActivityAt > INACTIVITY_MS;
}
