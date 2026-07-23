# Prato

Multi-tenant SaaS for restaurants — **order → kitchen → payment** across every
ordering channel, with a real-time Kitchen Display System (KDS) as the spine.

> **Status: design → scaffold.** This repo is the monorepo skeleton plus the three
> web apps, built from the design docs. The API runs on **stub in-memory data**
> (`USE_STUB_DATA=true`) so the frontends work end-to-end without a database yet;
> MikroORM/Postgres/RLS are scaffolded and wired in the backend phase.

## Monorepo layout ("polyrepo-in-folder" — no workspace, apps are independent)
```
prato/
├── apps/
│   ├── api/          NestJS 11 + WS gateway (stub data in the skeleton)
│   ├── web-staff/    React 19 — waiter + POS + admin (PWA)
│   ├── web-kds/      React 19 — Kitchen Display (real-time kiosk)
│   └── web-order/    React 19 — public QR self-order + delivery storefront
├── tests/e2e/        Playwright (sole test layer, drives all apps)
├── tools/            dev orchestrator + CI helpers
├── deploy/           reverse-proxy + cloud manifests
├── docs/             tenancy · rls · event-contracts
├── docker-compose.dev.yml   postgres + redis (weird ports)
└── docker-compose.ci.yml    full stack for E2E
```
Each React app follows the **Avenir Angular project convention**
(`core/pages/guards/shared`, `*.component/service/model`, central `app.routes.ts`)
— React code, Angular structure. See [apps/web-staff/README.md](apps/web-staff/README.md).

## Quick start

**Option A — everything in Docker (one command, no local Node):**
```bash
docker compose -f docker-compose.full.yml up -d --build
```
→ staff `:5173` · KDS `:5174` · diner `:5175` · API `:3000`. nginx in each web
image proxies `/api` and `/realtime` to the API, so there is nothing else to wire.
**No hot reload** — the images serve a production build.

**Option B — hybrid (the documented dev model, keeps HMR):**
```bash
# 1) infra only
docker compose -f docker-compose.dev.yml up -d

# 2) each app is independent — install per app
(cd apps/api        && cp .env.example .env && pnpm install && pnpm dev)  # :3000
(cd apps/web-staff  && pnpm install && pnpm dev)                          # :5173
(cd apps/web-kds    && pnpm install && pnpm dev)                          # :5174
(cd apps/web-order  && pnpm install && pnpm dev)                          # :5175
```
Or orchestrate everything: `pnpm install && pnpm dev` at the root (runs `tools/dev.mjs`).
Use B for development; A for a quick demo or to hand the stack to someone else.

## Try the full loop (demo)
1. **Staff** (`:5173`) → login `waiter@demo.prato.app` / `prato123` → open a table → add items.
2. **KDS** (`:5174`) → login `kitchen@demo.prato.app` → items appear live → tap to `preparing`/`ready`.
3. **Diner** (`:5175/t/q_tb-1`) → scan flow → order → `/track` updates in real time.
4. **POS** (`:5173/pos`) → close the bill, register a split payment.

## Conventions (Avenir standard)
React 19 (no manual memo — React Compiler) · TanStack Router/Query · Tailwind 4
semantic tokens · Biome (bans `any`/`as`/`!`) · Conventional Commits · Playwright-only
· SonarQube 70% on new code. Multi-tenancy is a hard invariant (see [docs/tenancy.md](docs/tenancy.md)).

## Design docs
The full architecture lives in the design notes (`context`, `architecture`,
`backend`, `frontend`, `business-rules`, `codebase`, `integrations`) and is
distilled into [docs/](docs/) for the cross-cutting contracts.
