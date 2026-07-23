import { Link, Outlet, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { hasPermission, logout, type Permission } from './core/auth.service';
import { realtime } from './core/realtime.service';
import { useTenant } from './core/tenant.context';

interface NavItem {
  to: string;
  label: string;
  permission: Permission;
}

const NAV: NavItem[] = [
  { to: '/floor', label: 'Salão', permission: 'floor' },
  { to: '/pos', label: 'Caixa', permission: 'pos' },
  { to: '/admin/menu', label: 'Cardápio', permission: 'admin' },
  { to: '/admin/tables', label: 'Mesas & QR', permission: 'admin' },
  { to: '/admin/staff', label: 'Equipe', permission: 'admin' },
  { to: '/admin/sales', label: 'Vendas', permission: 'admin' },
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
    <div className="flex min-h-full">
      <aside className="flex w-52 flex-col border-r border-border bg-surface p-4">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-primary">Prato</h1>
          <p className="text-xs text-muted">{userName}</p>
          <p className="text-xs text-muted">{role}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((item) => hasPermission(item.permission)).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-sm text-fg hover:bg-surface-2 [&.active]:bg-primary [&.active]:text-primary-fg"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="mt-4 rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-surface-2"
        >
          Sair
        </button>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
