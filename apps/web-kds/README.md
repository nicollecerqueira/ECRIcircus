# @prato/web-kds

Kitchen Display System — kitchen line (React 19, real-time, kiosk/PWA). Same
Avenir Angular project convention as the other apps.

```bash
pnpm install
pnpm dev        # http://localhost:5174  (proxies /api and /realtime → :3000)
```

- **Station picker** (`/`) → **Station board** (`/station/$id`).
- Tickets age by color (green → yellow → red). One tap = `preparing`, next = `ready`.
- Driven by socket events (`item.fired` / `item.preparing` / `item.ready`); a slow
  refetch is only a safety net. Never shows a login wall mid-service (silent refresh).
