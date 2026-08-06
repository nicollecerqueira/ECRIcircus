import { Migration } from '@mikro-orm/migrations';

/** Fase 5 — estações de cozinha viram tabela (antes eram constante no stub). */
export class Migration20260721000006Station extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists stations (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        code varchar(40) not null,
        name varchar(60) not null,
        kind varchar(30) not null,
        sort_order int not null default 0,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_stations_tenant on stations (tenant_id);');
    // Código único por marca — dois tenants podem ter "st-lanches" cada um.
    this.addSql(
      'create unique index if not exists uq_stations_tenant_code on stations (tenant_id, code);',
    );
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists stations cascade;');
  }
}
