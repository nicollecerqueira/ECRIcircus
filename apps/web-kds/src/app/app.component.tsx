import { Outlet } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { realtime } from './core/realtime.service';

/** Kiosk shell: bare outlet + a subtle reconnecting badge (never a login wall). */
export function AppComponent() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const rt = realtime();
    rt.connect();
    const timer = setInterval(() => setConnected(rt.connected), 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-full">
      {/* Único ornamento do quiosque: uma fita fina no topo. O quadro de
          comandas não ganha mais nada — nada pode competir com o status. */}
      <div aria-hidden className="circus-stripes" />
      {!connected && (
        <div className="fixed right-3 top-3 z-50 rounded-full bg-warning/20 px-3 py-1 text-xs font-medium text-warning">
          reconectando…
        </div>
      )}
      <Outlet />
    </div>
  );
}
