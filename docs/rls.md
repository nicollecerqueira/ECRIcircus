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

## Status (Fase 9) — prova em `orders`

A migration `Migration20260721000007OrdersRls` habilita RLS + `FORCE` + a policy
`tenant_isolation` em **`orders`**, e cria a role restrita **`prato_rls`** (não
superuser, não bypassrls).

Provado ao vivo, conectado como `prato_rls`:
- sem `app.tenant_id` → **0 linhas** (fail-closed);
- `SET app.tenant_id` da marca A → só pedidos da marca A; da marca B → só da B;
- `INSERT` de um pedido de outro tenant → `new row violates row-level security policy`.

A API **hoje conecta como `prato` (superuser)**, que bypassa RLS — por isso
habilitar isto não alterou o comportamento do app. É uma segunda trava latente,
pronta para ser efetivada.

### Rollout para efetivar (todas as tabelas)
1. **Conectar como `prato_rls`** em vez de `prato` (novo `DATABASE_URL` de runtime).
   Migrations e seeds continuam rodando como owner/superuser (operam cross-tenant
   no boot).
2. **Setar o GUC por requisição**: envolver a request num `em.transactional(...)`
   e emitir `SET LOCAL app.tenant_id = '<tenant>'` no `TenantInterceptor` antes das
   queries (o `LOCAL` reseta sozinho no fim da transação — resolve o pool).
3. **Aplicar a mesma policy** às demais tabelas de negócio: `order_items`,
   `payments`, `tables`, `table_sessions`, `menu_categories`, `menu_items`,
   `stations`, `locations`, `users`.
4. **Caminhos legítimos sem tenant** (login por email, seeds, cardápio público,
   `resolveQr`): usam um caminho de bypass auditado (conexão/role separada), pois
   não há `tenant_id` a impor — o login, por exemplo, descobre o tenant só depois
   de achar o usuário.
