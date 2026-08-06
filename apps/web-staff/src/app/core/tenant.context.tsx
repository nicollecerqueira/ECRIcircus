import { createContext, type ReactNode, useContext } from 'react';
import { useAuthStore } from './auth.store';

/**
 * Current brand/location context. Derived from the JWT claims held in the session;
 * exposed to feature components that need to scope requests or labels.
 */
interface TenantValue {
  /** Quem está logado. A tela de contas usa para reconhecer a PRÓPRIA linha —
      é o que separa "remover o fulano" de "me trancar para fora". */
  userId: string | null;
  userName: string | null;
  role: string | null;
}

const TenantContext = createContext<TenantValue>({ userId: null, userName: null, role: null });

export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return (
    <TenantContext.Provider
      value={{
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        role: user?.role ?? null,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
