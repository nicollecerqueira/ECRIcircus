import { Migration } from '@mikro-orm/migrations';

/** Fase 3 — mesas e sessões de mesa, escopadas por marca/unidade. */
export class Migration20260721000004TableSession extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists tables (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        location_id uuid not null references locations(id) on delete cascade,
        number int not null,
        seats int not null,
        qr_token varchar(80) not null,
        status varchar(12) not null default 'open',
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_tables_tenant on tables (tenant_id);');
    this.addSql('create index if not exists idx_tables_location on tables (location_id);');
    this.addSql('create unique index if not exists uq_tables_qr_token on tables (qr_token);');

    this.addSql(`
      create table if not exists table_sessions (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        table_id uuid not null references tables(id) on delete cascade,
        opened_at timestamptz not null default now(),
        closed_at timestamptz null,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql(
      'create index if not exists idx_table_sessions_tenant on table_sessions (tenant_id);',
    );
    this.addSql(
      'create index if not exists idx_table_sessions_table on table_sessions (table_id);',
    );
    // No máximo UMA sessão aberta por mesa. Trava no banco, redundante de
    // propósito sobre a checagem no service (mesma filosofia do RLS na Fase 9).
    this.addSql(`
      create unique index if not exists uq_open_session_per_table
        on table_sessions (table_id) where closed_at is null;
    `);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists table_sessions cascade;');
    this.addSql('drop table if exists tables cascade;');
  }
}
