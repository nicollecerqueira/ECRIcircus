import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { router } from './app.routes';
import { setupAuthInterceptors } from './core/auth.interceptor';
import { refreshSession } from './core/auth.service';
import { initRealtime } from './core/realtime.service';
import { TenantProvider } from './core/tenant.context';

// Provider composition + bootstrap (Angular app.config.ts + provideAppInitializer).
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5000, retry: 1 } },
});

// Wire cross-cutting singletons once at module load.
setupAuthInterceptors();
initRealtime(queryClient);

export function App() {
  const [ready, setReady] = useState(false);

  // App initializer: attempt a silent refresh once before first paint.
  useEffect(() => {
    refreshSession().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <RouterProvider router={router} />
      </TenantProvider>
    </QueryClientProvider>
  );
}
