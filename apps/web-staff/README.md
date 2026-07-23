# @prato/web-staff

Waiter · Cashier · Manager (React 19, PWA). Organized with the **Avenir Angular
project convention** (`core/pages/guards/shared`, `*.component/service/model`
naming, central `app.routes.ts`).

```bash
pnpm install
pnpm dev        # http://localhost:5173  (proxies /api and /realtime → :3000)
```

## Layout
```
src/app/
├── app.component.tsx   perm-gated sidebar shell + <Outlet/>
├── app.routes.ts       central route table + guard data (protected_[perms/roles])
├── app.config.tsx      QueryClient + Router providers + bootstrap (silent refresh)
├── core/               singletons: api.client · auth.interceptor · auth.service ·
│                       auth.store (zustand) · realtime.service · tenant.context
├── guards/             auth.guard · permission.guard (TanStack beforeLoad)
├── shared/             ui components · form-field · utils (money, time-ago)
└── pages/              floor · order · pos · admin (component + service + model)
```

Real-time: `core/realtime.service.ts` opens one Socket.IO connection and
**invalidates React Query caches** on events (never carries source of truth).
