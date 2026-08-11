import { Migration } from '@mikro-orm/migrations';

/**
 * Sala de entrega gravada NO ITEM, no instante em que ele foi lançado.
 *
 * A sala vive na conta, e a conta é da pessoa — que circula. Quando ela pede de
 * novo de outra sala, a conta inteira passa a apontar para a sala nova, e os
 * itens do pedido anterior, ainda na cozinha, herdam um destino que não é o
 * deles. Guardando a sala no item, cada pedido leva o endereço que valia quando
 * foi feito.
 *
 * Nulo nos itens antigos: para eles vale a sala da conta, como antes.
 */
export class Migration20260731000016OrderItemDeliveryRoom extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table order_items add column if not exists delivery_room varchar(120) null;',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table order_items drop column if exists delivery_room;');
  }
}
