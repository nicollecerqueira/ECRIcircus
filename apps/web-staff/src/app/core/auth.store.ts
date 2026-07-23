import { create } from 'zustand';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * In-memory session store backing auth.service (Angular `BehaviorSubject` → zustand).
 * Tokens are NEVER persisted to localStorage; only the last email is kept for prefill.
 * A page refresh relies on the silent refresh flow (auth.refresh once at bootstrap).
 */
interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: SessionUser | null;
  lastEmail: string | null;
  setSession: (p: { accessToken: string; refreshToken: string; user: SessionUser }) => void;
  clear: () => void;
}

const LAST_EMAIL_KEY = 'prato.lastEmail';

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  lastEmail: localStorage.getItem(LAST_EMAIL_KEY),
  setSession: ({ accessToken, refreshToken, user }) => {
    localStorage.setItem(LAST_EMAIL_KEY, user.email);
    set({ accessToken, refreshToken, user, lastEmail: user.email });
  },
  clear: () => set({ accessToken: null, refreshToken: null, user: null }),
}));
