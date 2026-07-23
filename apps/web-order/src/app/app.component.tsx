import { Outlet } from '@tanstack/react-router';

/** Minimal public chrome. web-order stays a plain, fast, install-free page. */
export function AppComponent() {
  return (
    <div className="min-h-full">
      <header className="border-b border-border bg-surface px-4 py-3">
        <span className="text-lg font-bold text-primary">Prato</span>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
