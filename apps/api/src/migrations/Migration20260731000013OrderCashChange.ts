import { Migration } from '@mikro-orm/migrations';

/**
 * Troco declarado pelo cliente quando escolhe dinheiro no app de pedido.
 */
export class Migration20260731000013OrderCashChange extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders add column if not exists cash_needs_change boolean null;');
    this.addSql('alter table orders add column if not exists cash_change_for_cents int null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table orders drop column if exists cash_change_for_cents;');
    this.addSql('alter table orders drop column if exists cash_needs_change;');
  }
}
