import { Migration } from '@mikro-orm/migrations';

/**
 * Nome de quem pediu, no pedido.
 *
 * Com a saída do QR de mesa, a conta deixou de ser identificada pela mesa e
 * passou a ser identificada pela PESSOA: o cliente digita o nome no app e o
 * salão lista "Conta da Ana" em vez de um UUID. Nulo é permitido — pedidos
 * antigos (e contas abertas sem nome no balcão) continuam válidos e caem no
 * rótulo por id curto.
 */
export class Migration20260731000008OrderCustomerName extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders add column if not exists customer_name varchar(80) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table orders drop column if exists customer_name;');
  }
}
