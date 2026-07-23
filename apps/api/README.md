# @prato/api

NestJS 11 + MikroORM + Postgres + Redis + Socket.IO gateway.

> **Skeleton phase.** Runs with `USE_STUB_DATA=true`: in-memory stub data so the
> three frontends can develop against a real API + real-time gateway **without a
> database**. MikroORM/Postgres/RLS are scaffolded (`mikro-orm.config.ts`,
> `docs/rls.md`) and wired in the backend phase.

## Run
```bash
cp .env.example .env
pnpm install
pnpm dev            # http://localhost:3000/api/v1  (WS on /realtime)
```
Redis is optional in the skeleton (the Socket.IO adapter falls back to in-memory).

## Demo login
All demo users share the password `prato123`:

| Email | Role |
|-------|------|
| `owner@demo.prato.app` | brand_owner |
| `manager@demo.prato.app` | location_manager |
| `waiter@demo.prato.app` | waiter |
| `cashier@demo.prato.app` | cashier |
| `kitchen@demo.prato.app` | kitchen |

## Layout (DDD / hexagonal)
```
src/
├── auth/                 Tenancy & Identity — JWT, RBAC, guards
├── common/
│   ├── tenant/           AsyncLocalStorage tenant context + interceptor (isolation L1)
│   └── events/           domain event names + payloads
├── contexts/             bounded contexts (domain/application/infrastructure)
│   ├── catalog/          menu (public read for QR/storefront)
│   ├── table-session/    tables, QR binding, sessions
│   ├── order/            Order aggregate — the core loop root
│   ├── kitchen/          KDS board + item cook state
│   └── payment/          registration + split + non-fiscal receipt
├── realtime/             Socket.IO gateway + Redis adapter (the real-time spine)
└── stub/                 demo seed (skeleton only)
```

## Key endpoints (`/api/v1`)
`POST /auth/login · /auth/refresh` · `GET /menu` · `GET /tables` · `POST /sessions`
· `POST /diner-sessions` · `POST /orders` · `POST /orders/:id/items`
· `PATCH /kds/items/:itemId/state` · `GET /kds/stations/:id/board`
· `POST /orders/:id/payments` · `POST /orders/:id/close` · `WS /realtime`
