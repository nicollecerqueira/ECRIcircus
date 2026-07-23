import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { router } from './app.routes';
import { setupAuthInterceptors } from './core/auth.interceptor';
import { refreshSession } from './core/auth.service';
import { initRealtime } from './core/realtime.service';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 3000, retry: 1 } },
});

setupAuthInterceptors();
initRealtime(queryClient);

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    refreshSession().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
