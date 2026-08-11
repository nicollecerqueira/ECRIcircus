import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Tempo PARADO que encerra a sessão. Conta desde o último sinal de vida da
 * pessoa (toque, tecla, rolagem) — não desde o login: quem está usando o app
 * sem parar nunca é interrompido, e quem largou o aparelho no balcão perde o
 * acesso sozinho.
 */
export const INACTIVITY_MS = 10 * 60 * 1000;

/**
 * Grava no máximo um "sinal de vida" a cada 15s. Sem isto, cada toque na tela
 * escreveria no armazenamento do navegador — centenas de gravações por minuto
 * num balcão movimentado, sem ganho nenhum de precisão.
 */
const TOUCH_THROTTLE_MS = 15_000;

/**
 * Sessão do staff.
 *
 * Os tokens são PERSISTIDOS (antes viviam só em memória, e recarregar a página
 * derrubava o login no meio do atendimento). O que limita o risco de guardá-los
 * no navegador é o corte por inatividade: sessão parada há mais de dez minutos
 * é descartada na volta, mesmo que o aparelho tenha ficado desligado.
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  lastEmail: string | null;
  /** Último sinal de vida, em epoch ms. Base do corte por inatividade. */
  lastActivityAt: number;
  setSession: (p: { accessToken: string; refreshToken: string; user: SessionUser }) => void;
  /** Registra atividade da pessoa — adia o corte. */
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
      name: 'ecri.staff.session',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Sessão que passou do tempo de inatividade — não vale mais, nem após recarregar. */
export function sessionExpirada(): boolean {
  const { accessToken, lastActivityAt } = useAuthStore.getState();
  return accessToken !== null && Date.now() - lastActivityAt > INACTIVITY_MS;
}
