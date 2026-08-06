import { Migration } from '@mikro-orm/migrations';

/**
 * Forma de pagamento declarada pelo cliente no app (intenção, não pagamento).
 *
 * Sobe do app do cliente para o salão: sem isto, a escolha "colocar na conta"
 * morria no texto do WhatsApp e o balcão não tinha como saber que aquele pedido
 * ficou em aberto. Também é o que permite juntar novos pedidos "na conta" na
 * conta que a pessoa já tem aberta, em vez de abrir uma por pedido.
 *
 * O índice cobre exatamente essa busca (unidade + intenção + nome).
 */
export class Migration20260731000010OrderPaymentIntent extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders add column if not exists payment_intent varchar(12) null;');
    this.addSql(`
      create index if not exists idx_orders_open_account
        on orders (location_id, payment_intent, lower(customer_name));
    `);
  }

  async down(): Promise<void> {
    this.addSql('drop index if exists idx_orders_open_account;');
    this.addSql('alter table orders drop column if exists payment_intent;');
  }
}
