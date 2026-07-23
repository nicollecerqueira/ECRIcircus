# Tenancy

**Model:** multi-tenant SaaS, one deployment, many restaurants. Shared database,
shared schema, row-level `tenant_id` on every business table.

- **Tenant = one restaurant brand.** A brand has many **locations** (units).
- Each location owns its tables, menu availability, and kitchen stations, but
  shares the brand's menu catalog and staff directory.

## Three layers of isolation (defense in depth)
1. **Request context** — a NestJS interceptor resolves `tenantId` (+ `locationId`)
   from the JWT or the QR session token and stores it in `AsyncLocalStorage`.
2. **ORM global filter** — a MikroORM `@Filter` on `tenant_id` is enabled by
   default from that context. Every query is auto-scoped. Opting out requires an
   explicit, reviewed flag.
3. **Postgres RLS** — row-level security policies on `tenant_id` using a session
   GUC (`SET app.tenant_id`). See [rls.md](./rls.md).

> A cross-tenant read or write is a **P0 security bug.** E2E tests assert tenant A
> can never see tenant B's orders.

## JWT claims
`sub`, `tenantId`, `locationId`, `role`, `stationIds?`. QR diners are not users:
they get an anonymous, table-scoped session token (no login).
