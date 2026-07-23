import { Migration } from '@mikro-orm/migrations';

/** Fase 2 — catálogo (categorias e itens de cardápio), escopado por marca. */
export class Migration20260721000002Catalog extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists menu_categories (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        name varchar(120) not null,
        sort_order int not null default 0,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql(
      'create index if not exists idx_menu_categories_tenant on menu_categories (tenant_id);',
    );

    this.addSql(`
      create table if not exists menu_items (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        category_id uuid not null references menu_categories(id) on delete cascade,
        name varchar(160) not null,
        price_cents int not null,
        available boolean not null default true,
        station_id varchar(60) not null,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_menu_items_tenant on menu_items (tenant_id);');
    this.addSql('create index if not exists idx_menu_items_category on menu_items (category_id);');
    // Preço em centavos: nunca negativo.
    this.addSql(`
      do $$ begin
        alter table menu_items add constraint chk_menu_items_price check (price_cents >= 0);
      exception when duplicate_object then null; end $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists menu_items cascade;');
    this.addSql('drop table if exists menu_categories cascade;');
  }
}
