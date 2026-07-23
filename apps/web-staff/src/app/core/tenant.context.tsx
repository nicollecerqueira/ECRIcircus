import { createContext, type ReactNode, useContext } from 'react';
import { useAuthStore } from './auth.store';

/**
 * Current brand/location context. Derived from the JWT claims held in the session;
 * exposed to feature components that need to scope requests or labels.
 */
interface TenantValue {
  userName: string | null;
  role: string | null;
}

const TenantContext = createContext<TenantValue>({ userName: null, role: null });

export function TenantProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return (
    <TenantContext.Provider value={{ userName: user?.name ?? null, role: user?.role ?? null }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
