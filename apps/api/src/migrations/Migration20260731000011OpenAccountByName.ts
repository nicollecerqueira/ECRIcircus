import { Migration } from '@mikro-orm/migrations';

/**
 * Índice da busca "conta aberta desta pessoa".
 *
 * Substitui `idx_orders_open_account`, que incluía `payment_intent` porque a
 * regra original só juntava pedidos "na conta". A regra passou a valer para
 * QUALQUER forma de pagamento — a conta é da pessoa, não da compra —, então a
 * coluna de intenção saiu da busca e sairia do índice de qualquer jeito.
 */
export class Migration20260731000011OpenAccountByName extends Migration {
  async up(): Promise<void> {
    this.addSql('drop index if exists idx_orders_open_account;');
    this.addSql(`
      create index if not exists idx_orders_open_account
        on orders (location_id, lower(customer_name));
    `);
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists idx_orders_open_account;');
    this.addSql(`
      create index if not exists idx_orders_open_account
        on orders (location_id, payment_intent, lower(customer_name));
    `);
  }
}
