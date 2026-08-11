import { Migration } from '@mikro-orm/migrations';

/**
 * Item que NÃO passa pela cozinha — a ficha é o caso que motivou isto.
 *
 * Ficha é crédito, não comida: não há o que preparar nem o que entregar. Sem
 * esta marca, comprar uma ficha criava uma comanda na fila do KDS, e alguém na
 * cozinha ficava esperando para "preparar" algo que não existe.
 *
 * `default true` porque tudo que já está cadastrado é comida de verdade.
 */
export class Migration20260731000015MenuItemNoPrep extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table menu_items add column if not exists requires_preparation boolean not null default true;',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table menu_items drop column if exists requires_preparation;');
  }
}
