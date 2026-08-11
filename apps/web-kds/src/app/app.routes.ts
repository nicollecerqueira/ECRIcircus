import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppComponent } from './app.component';
import { isAuthenticated } from './core/auth.service';
import { kdsGuard } from './guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { StationBoardComponent } from './pages/station/station-board.component';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginComponent,
  // `expirado` é posto pelo corte por inatividade: sem ele, a pessoa volta ao
  // login sem saber por quê e acha que o sistema a derrubou por erro.
  validateSearch: (search: Record<string, unknown>): { redirect?: string; expirado?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
    expirado: search.expirado === '1' ? '1' : undefined,
  }),
});

// Kiosk shell wraps the authenticated screens.
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: AppComponent,
});

const pickerRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/',
  component: StationBoardComponent,
  beforeLoad: kdsGuard,
});

const boardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/station/$id',
  beforeLoad: () => {
    throw redirect({ to: '/' });
  },
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: isAuthenticated() ? '/' : '/login' });
  },
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  shellRoute.addChildren([pickerRoute, boardRoute]),
  catchAllRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
