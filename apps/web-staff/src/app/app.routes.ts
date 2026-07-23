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
import {
  SalesAdminComponent,
  StaffAdminComponent,
  TablesAdminComponent,
} from './pages/admin/placeholders.component';
import { FloorComponent } from './pages/floor/floor.component';
import { TableDetailComponent } from './pages/floor/table-detail.component';
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
});

const tableDetailRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/floor/table/$id',
  component: TableDetailComponent,
  beforeLoad: protected_(['floor']),
});

const orderRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/order/$id',
  component: OrderComponent,
  beforeLoad: protected_(['order']),
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

const adminRoles = { roles: ['location_manager', 'brand_owner'] };
const menuAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/menu',
  component: MenuAdminComponent,
  beforeLoad: protected_(['admin'], adminRoles),
});
const tablesAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/tables',
  component: TablesAdminComponent,
  beforeLoad: protected_(['admin'], adminRoles),
});
const staffAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/staff',
  component: StaffAdminComponent,
  beforeLoad: protected_(['admin'], adminRoles),
});
const salesAdminRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: '/admin/sales',
  component: SalesAdminComponent,
  beforeLoad: protected_(['admin'], adminRoles),
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
    tableDetailRoute,
    orderRoute,
    posRoute,
    checkoutRoute,
    menuAdminRoute,
    tablesAdminRoute,
    staffAdminRoute,
    salesAdminRoute,
  ]),
  catchAllRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
