import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { router } from './app.routes';
import { setupAuthInterceptors } from './core/auth.interceptor';
import { refreshSession } from './core/auth.service';
import { sessionExpirada, useAuthStore } from './core/auth.store';
import { initRealtime } from './core/realtime.service';
import { encerrarPorInatividade, vigiarInatividade } from './core/session-timeout';
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

  // App initializer: a sessão vem do armazenamento do navegador, então a
  // primeira pergunta é se ela ainda vale. Passou dos dez minutos parada,
  // morre aqui — antes de qualquer tela pintar com dado de quem já saiu.
  useEffect(() => {
    if (sessionExpirada()) {
      useAuthStore.getState().clear();
      setReady(true);
      return;
    }
    // O token de acesso dura 15 min e pode ter vencido com o app fechado; o de
    // renovação vale dias. Esta troca devolve um par novo antes do primeiro
    // pedido à API, em vez de deixar a primeira tela falhar e se recuperar.
    refreshSession().finally(() => setReady(true));
  }, []);

  useEffect(() => vigiarInatividade(encerrarPorInatividade), []);

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
