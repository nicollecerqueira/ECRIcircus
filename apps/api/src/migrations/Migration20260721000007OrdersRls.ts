import { Migration } from '@mikro-orm/migrations';

/**
 * Fase 9 — PROVA de RLS (camada 3 de isolamento) na tabela `orders`.
 *
 * Habilita RLS + FORCE + policy por tenant e cria uma role RESTRITA (não
 * superuser, não bypassrls) para a API conectar quando o RLS for efetivado.
 *
 * Seguro por quê: a API hoje conecta como `prato` (superuser), que BYPASSA RLS —
 * então habilitar isto não muda o comportamento do app. A prova roda com a role
 * `prato_rls`. Para EFETIVAR o RLS, a API precisa (1) conectar como `prato_rls` e
 * (2) setar `app.tenant_id` por requisição (SET LOCAL numa transação) — ver rls.md.
 */
export class Migration20260721000007OrdersRls extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders enable row level security;');
    this.addSql('alter table orders force row level security;');
    // `, true` (missing_ok) faz o GUC ausente virar NULL -> nenhuma linha casa
    // (fail-closed) em vez de estourar erro.
    this.addSql(`
      create policy tenant_isolation on orders
        using (tenant_id = current_setting('app.tenant_id', true)::uuid)
        with check (tenant_id = current_setting('app.tenant_id', true)::uuid);
    `);
    // Role restrita de aplicação, sujeita a RLS. Role é objeto de cluster: idempotente.
    this.addSql(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'prato_rls') then
          create role prato_rls login password 'prato_rls';
        end if;
      end $$;
    `);
    this.addSql('grant usage on schema public to prato_rls;');
    this.addSql('grant select, insert, update, delete on orders to prato_rls;');
  }

  async down(): Promise<void> {
    this.addSql('drop policy if exists tenant_isolation on orders;');
    this.addSql('alter table orders no force row level security;');
    this.addSql('alter table orders disable row level security;');
    this.addSql('revoke all on orders from prato_rls;');
    this.addSql('revoke usage on schema public from prato_rls;');
    // A role não é dropada no down: no rollout ela ganha grants em outras tabelas.
  }
}
