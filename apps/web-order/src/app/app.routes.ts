import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AppComponent } from './app.component';
import { CartComponent } from './pages/cart/cart.component';
import { MenuComponent } from './pages/menu/menu.component';
import { StorefrontComponent } from './pages/storefront/storefront.component';
import { OrderTrackComponent } from './pages/track/track.component';

const rootRoute = createRootRoute({ component: AppComponent });

/**
 * Não há mais QR de mesa nem sessão: o app abre direto no cardápio e qualquer
 * um pode montar um pedido de balcão. Por isso nenhuma rota tem `beforeLoad` —
 * o antigo `tableTokenGuard`, que mandava quem chegasse sem token para a tela
 * de "escaneie o QR", deixou de existir junto com as rotas /scan e /t/$qrToken.
 */
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/menu' });
  },
});

const menuRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/menu',
  component: MenuComponent,
});

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: CartComponent,
});

const trackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/track/$orderId',
  component: OrderTrackComponent,
});

// Vitrine de delivery por marca (cardápio de leitura, escopo pelo slug).
const storefrontRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/d/$slug',
  component: StorefrontComponent,
});

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '$',
  beforeLoad: () => {
    throw redirect({ to: '/menu' });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
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
