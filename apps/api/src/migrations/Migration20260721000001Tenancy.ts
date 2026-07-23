import { Migration } from '@mikro-orm/migrations';

/**
 * Fase 1 — schema base de Tenancy & Identity.
 *
 * Escrita à mão e IDEMPOTENTE (`IF NOT EXISTS`) porque as migrations rodam no
 * boot da API com `allOrNothing: false` — um container que sobe duas vezes, ou
 * um deploy que reinicia no meio, não pode quebrar por tentar recriar tabela.
 */
export class Migration20260721000001Tenancy extends Migration {
  async up(): Promise<void> {
    // brands = o tenant. Sem tenant_id: é a raiz da hierarquia.
    this.addSql(`
      create table if not exists brands (
        id uuid primary key,
        name varchar(120) not null,
        slug varchar(60) not null unique,
        created_at timestamptz not null default now()
      );
    `);

    this.addSql(`
      create table if not exists locations (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        name varchar(120) not null,
        timezone varchar(60) not null default 'America/Sao_Paulo',
        currency varchar(3) not null default 'BRL',
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_locations_tenant on locations (tenant_id);');

    this.addSql(`
      create table if not exists users (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        location_id uuid null references locations(id) on delete set null,
        email varchar(160) not null,
        password_hash varchar(120) not null,
        name varchar(120) not null,
        role varchar(40) not null,
        created_at timestamptz not null default now()
      );
    `);
    // Login é por e-mail: unicidade case-insensitive evita duas contas "iguais".
    this.addSql('create unique index if not exists uq_users_email on users (lower(email));');
    this.addSql('create index if not exists idx_users_tenant on users (tenant_id);');
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists users cascade;');
    this.addSql('drop table if exists locations cascade;');
    this.addSql('drop table if exists brands cascade;');
  }
}
