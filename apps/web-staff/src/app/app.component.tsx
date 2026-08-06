import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { hasPermission, logout, type Permission } from './core/auth.service';
import { realtime } from './core/realtime.service';
import { useTenant } from './core/tenant.context';
import { Art } from './shared/components/art';

interface NavItem {
  to: string;
  label: string;
  permission: Permission;
}

const NAV: NavItem[] = [
  { to: '/floor', label: 'Contas abertas', permission: 'floor' },
  { to: '/pos', label: 'Caixa', permission: 'pos' },
  { to: '/admin/menu', label: 'Cardápio', permission: 'admin' },
  // Só o dono tem a permissão `users`, então o link nem aparece para os demais.
  { to: '/admin/usuarios', label: 'Contas de acesso', permission: 'users' },
];

/** App shell — perm-gated sidebar + <Outlet/>. Login renders a bare outlet (root). */
export function AppComponent() {
  const { userName, role } = useTenant();
  const navigate = useNavigate();

  // Establish the WebSocket connection once the authenticated shell is mounted.
  useEffect(() => {
    realtime().connect();
  }, []);

  const signOut = () => {
    realtime().disconnect();
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="flex min-h-full flex-col">
      {/* Uma fita só, atravessando o topo do app inteiro — em cada painel
          separadamente viraria remendo. */}
      <div aria-hidden className="circus-stripes shrink-0" />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-56 flex-col border-r border-border bg-surface p-4">
          <div className="mb-5">
            <Art name="tent" size="sm" fallback="🎪" className="mb-1" />
            <h1 className="circus-wordmark whitespace-nowrap text-lg font-bold">ECRI Circus</h1>
            <div aria-hidden className="circus-hairline my-2" />
            <p className="text-sm font-medium text-fg">{userName}</p>
            <p className="text-xs uppercase tracking-wider text-muted">{role}</p>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {NAV.filter((item) => hasPermission(item.permission)).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg px-3 py-2 text-sm font-medium text-fg transition hover:bg-surface-2 [&.active]:bg-primary [&.active]:text-primary-fg [&.active]:shadow-sm"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-lg px-3 py-2 text-center text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            Sair
          </button>
        </aside>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
