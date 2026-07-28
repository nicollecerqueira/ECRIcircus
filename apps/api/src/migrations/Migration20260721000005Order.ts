import { Migration } from '@mikro-orm/migrations';

/** Fase 4 — Order (agregado raiz), OrderItem e Payment, escopados por marca/unidade. */
export class Migration20260721000005Order extends Migration {
  async up(): Promise<void> {
    this.addSql(`
      create table if not exists orders (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        location_id uuid not null references locations(id) on delete cascade,
        channel varchar(20) not null,
        table_id varchar(40) null,
        status varchar(24) not null default 'open',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_orders_tenant on orders (tenant_id);');
    this.addSql('create index if not exists idx_orders_location on orders (location_id);');
    this.addSql('create index if not exists idx_orders_table on orders (table_id);');

    this.addSql(`
      create table if not exists order_items (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        order_id uuid not null references orders(id) on delete cascade,
        menu_item_id varchar(40) not null,
        name varchar(160) not null,
        unit_price_cents int not null,
        qty int not null,
        station_id varchar(60) not null,
        state varchar(16) not null default 'queued',
        notes varchar(240) null,
        void_reason varchar(240) null,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_order_items_tenant on order_items (tenant_id);');
    this.addSql('create index if not exists idx_order_items_order on order_items (order_id);');
    this.addSql(`
      do $$ begin
        alter table order_items add constraint chk_order_items_qty check (qty >= 1);
        alter table order_items add constraint chk_order_items_price check (unit_price_cents >= 0);
      exception when duplicate_object then null; end $$;
    `);

    this.addSql(`
      create table if not exists payments (
        id uuid primary key,
        tenant_id uuid not null references brands(id) on delete cascade,
        order_id uuid not null references orders(id) on delete cascade,
        method varchar(16) not null,
        amount_cents int not null,
        note varchar(240) null,
        created_at timestamptz not null default now()
      );
    `);
    this.addSql('create index if not exists idx_payments_tenant on payments (tenant_id);');
    this.addSql('create index if not exists idx_payments_order on payments (order_id);');
    this.addSql(`
      do $$ begin
        alter table payments add constraint chk_payments_amount check (amount_cents > 0);
      exception when duplicate_object then null; end $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists payments cascade;');
    this.addSql('drop table if exists order_items cascade;');
    this.addSql('drop table if exists orders cascade;');
  }
}
