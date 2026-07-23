# Row-Level Security (RLS)

RLS is the third isolation layer: even a raw query or an ORM mistake cannot cross
tenants. Policies key off a session GUC set per request.

## Per-request setup
The API opens a connection (or uses a per-request transaction) and sets:

```sql
SET app.tenant_id = '<tenant-uuid>';
```

The interceptor that resolves the tenant context (see [tenancy.md](./tenancy.md))
issues this `SET` before any query runs, and resets it when the request ends.

## Policy template (applied to every business table)
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
```

- `USING` guards reads; `WITH CHECK` guards writes (no inserting rows for another
  tenant).
- `FORCE ROW LEVEL SECURITY` ensures the policy applies even to the table owner.

## Notes
- The DB role the API connects as must **not** be `BYPASSRLS`.
- Platform-admin (Avenir) operations that legitimately span tenants use a
  separate, explicitly-audited code path — never the normal request context.
