import { Migration } from '@mikro-orm/migrations';

/**
 * Combos no cardápio: vendidos como item único, com composição visível.
 */
export class Migration20260731000014MenuItemCombos extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table menu_items add column if not exists is_combo boolean not null default false;',
    );
    this.addSql('alter table menu_items add column if not exists combo_items text null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table menu_items drop column if exists combo_items;');
    this.addSql('alter table menu_items drop column if exists is_combo;');
  }
}
