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
import { StationPickerComponent } from './pages/station/station-picker.component';

const rootRoute = createRootRoute({ component: Outlet });

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginComponent,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
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
  component: StationPickerComponent,
  beforeLoad: kdsGuard,
});

const boardRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/station/$id',
  component: StationBoardComponent,
  beforeLoad: kdsGuard,
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
