import { Migration } from '@mikro-orm/migrations';

/**
 * Sala onde a pessoa está — o destino da entrega.
 *
 * Sem mesa e sem balcão para retirar, o pedido é levado até onde a pessoa está.
 * O nome e a equipe dizem de QUEM é a conta; a sala é a única informação que diz
 * PARA ONDE o pedido vai. Texto livre: as salas mudam por temporada e não valem
 * uma tabela.
 */
export class Migration20260731000012OrderDeliveryRoom extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders add column if not exists delivery_room varchar(60) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table orders drop column if exists delivery_room;');
  }
}
