import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router';
import { AppComponent } from './app.component';
import { isAuthenticated } from './core/auth.service';
import { protected_ } from './guards/permission.guard';
import { MenuAdminComponent } from './pages/admin/menu.component';
import { UsersAdminComponent } from './pages/admin/users.component';
import { FloorComponent } from './pages/floor/floor.component';
import { LoginComponent } from './pages/login/login.component';
import { OrderComponent } from './pages/order/order.component';
import { CheckoutComponent } from './pages/pos/checkout.component';
import { PosComponent } from './pages/pos/pos.component';

// Root renders a bare outlet; the shell (sidebar) lives on a pathless layout route.
const rootRoute = createRootRoute({ component: Outlet });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: isAuthenticated() ? '/floor' : '/login' });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginComponent,
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  }),
});

// Authenticated shell (Angular app.component with perm-gated sidebar).
const shellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'shell',
  component: AppComponent,
});

const floorRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/floor',
  component: FloorComponent,
  beforeLoad: protected_(['floor']),
  // Equipe escolhida no salão. Fica na URL para que voltar do detalhe do pedido
  // caia na lista da mesma equipe, em vez de recomeçar a busca do zero.
  validateSearch: (search: Record<string, unknown>): { team?: string } => ({
    team: typeof search.team === 'string' && search.team.length > 0 ? search.team : undefined,
  }),
});

const orderRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/order/$id',
  component: OrderComponent,
  beforeLoad: protected_(['order']),
  // De que equipe se veio (ou para qual a conta foi aberta). Serve só para o
  // "Voltar ao salão" devolver a lista daquela equipe em vez de recomeçar na
  // escolha — o garçom que abriu conta da BANDINHA vai abrir outra da BANDINHA.
  validateSearch: (search: Record<string, unknown>): { team?: string } => ({
    team: typeof search.team === 'string' && search.team.length > 0 ? search.team : undefined,
  }),
});

const posRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/pos',
  component: PosComponent,
  beforeLoad: protected_(['pos'], { roles: ['cashier', 'location_manager', 'brand_owner'] }),
});

const checkoutRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/pos/checkout/$orderId',
  component: CheckoutComponent,
  beforeLoad: protected_(['pos']),
});

// Mesas & QR, Equipe e Vendas foram removidos: sem mesa não há QR para gerir, e
// os outros dois eram telas de rascunho que não entram nesta operação.
const adminRoles = { roles: ['location_manager', 'brand_owner'] };
const menuAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/menu',
  component: MenuAdminComponent,
  beforeLoad: protected_(['admin'], adminRoles),
});

// Contas de acesso: só o dono. A permissão `users` já é exclusiva dele, e o
// papel vai junto para a regra não depender de um único ponto — a API exige
// `brand_owner` de qualquer forma, então URL digitada à mão não passa.
const usersAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/usuarios',
  component: UsersAdminComponent,
  beforeLoad: protected_(['users'], { roles: ['brand_owner'] }),
});

// Catch-all → login.
const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/login' });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  shellRoute.addChildren([
    floorRoute,
    orderRoute,
    posRoute,
    checkoutRoute,
    menuAdminRoute,
    usersAdminRoute,
  ]),
  catchAllRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
