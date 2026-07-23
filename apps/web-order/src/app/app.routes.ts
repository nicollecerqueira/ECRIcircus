import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AppComponent } from './app.component';
import { tableTokenGuard } from './guards/table.guard';
import { CartComponent } from './pages/cart/cart.component';
import { MenuComponent } from './pages/menu/menu.component';
import { ScanComponent } from './pages/scan/scan.component';
import { StorefrontComponent } from './pages/storefront/storefront.component';
import { TableLandingComponent } from './pages/table/table-landing.component';
import { OrderTrackComponent } from './pages/track/track.component';

const rootRoute = createRootRoute({ component: AppComponent });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/scan' });
  },
});

const scanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/scan',
  component: ScanComponent,
});

// Diner scans the table QR here.
const landingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/t/$qrToken',
  component: TableLandingComponent,
});

// Table-scoped routes (require a table token).
const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/menu',
  component: MenuComponent,
  beforeLoad: tableTokenGuard,
});
const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartComponent,
  beforeLoad: tableTokenGuard,
});
const trackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/track/$orderId',
  component: OrderTrackComponent,
  beforeLoad: tableTokenGuard,
});

// Public delivery storefront (no token).
const storefrontRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/d/$slug',
  component: StorefrontComponent,
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/scan' });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  scanRoute,
  landingRoute,
  menuRoute,
  cartRoute,
  trackRoute,
  storefrontRoute,
  catchAllRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
