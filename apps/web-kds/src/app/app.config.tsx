import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { router } from './app.routes';
import { setupAuthInterceptors } from './core/auth.interceptor';
import { refreshSession } from './core/auth.service';
import { sessionExpirada, useAuthStore } from './core/auth.store';
import { initRealtime } from './core/realtime.service';
import { encerrarPorInatividade, vigiarInatividade } from './core/session-timeout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 3000, retry: 1 } },
});

setupAuthInterceptors();
initRealtime(queryClient);

export function App() {
  const [ready, setReady] = useState(false);

  // A sessão vem do armazenamento do navegador: a primeira pergunta é se ela
  // ainda vale. Passou dos dez minutos parada, morre aqui.
  useEffect(() => {
    if (sessionExpirada()) {
      useAuthStore.getState().clear();
      setReady(true);
      return;
    }
    refreshSession().finally(() => setReady(true));
  }, []);

  useEffect(() => vigiarInatividade(encerrarPorInatividade), []);

  if (!ready) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
