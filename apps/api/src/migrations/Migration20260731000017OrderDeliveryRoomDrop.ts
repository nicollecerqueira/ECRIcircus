import { Migration } from '@mikro-orm/migrations';

/**
 * Remove `delivery_room` de `orders` e `order_items`.
 *
 * O app do cliente (web-order) deixou de ser um canal de pedido — virou só
 * vitrine de cardápio. Quem faz o pedido agora é sempre a equipe, presencial,
 * e ela não coleta "sala de entrega" em lugar nenhum do fluxo. Sem quem
 * preencha o campo, ele não tem mais uso.
 */
export class Migration20260731000017OrderDeliveryRoomDrop extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders drop column if exists delivery_room;');
    this.addSql('alter table order_items drop column if exists delivery_room;');
  }

  async down(): Promise<void> {
    this.addSql('alter table orders add column if not exists delivery_room varchar(60) null;');
    this.addSql(
      'alter table order_items add column if not exists delivery_room varchar(120) null;',
    );
  }
}
