import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AppComponent } from './app.component';
import { MenuComponent } from './pages/menu/menu.component';
import { StorefrontComponent } from './pages/storefront/storefront.component';

const rootRoute = createRootRoute({ component: AppComponent });

/**
 * Não há mais QR de mesa nem sessão, nem carrinho: o app abre direto no
 * cardápio, que é só vitrine (itens, preços, promoções). Quem quiser pedir
 * fala com a equipe no balcão. Por isso nenhuma rota tem `beforeLoad` — o
 * antigo `tableTokenGuard`, que mandava quem chegasse sem token para a tela
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

const routeTree = rootRoute.addChildren([indexRoute, menuRoute, storefrontRoute, catchAllRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
