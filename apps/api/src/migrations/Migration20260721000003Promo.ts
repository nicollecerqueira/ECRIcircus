import { Migration } from '@mikro-orm/migrations';

/**
 * Promoção por item: preço promocional com janela opcional de validade.
 *
 * Preço FIXO em centavos, não percentual — percentual arredonda em cada item e
 * erro de arredondamento no dinheiro só aparece no fechamento do caixa.
 */
export class Migration20260721000003Promo extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table menu_items add column if not exists promo_price_cents int null;');
    this.addSql(
      'alter table menu_items add column if not exists promo_starts_at timestamptz null;',
    );
    this.addSql('alter table menu_items add column if not exists promo_ends_at timestamptz null;');

    // Promoção não pode ser negativa nem mais cara que o preço normal — senão
    // não é promoção, é aumento disfarçado.
    this.addSql(`
      do $$ begin
        alter table menu_items add constraint chk_menu_items_promo
          check (promo_price_cents is null or (promo_price_cents >= 0 and promo_price_cents < price_cents));
      exception when duplicate_object then null; end $$;
    `);
    // Janela coerente: fim depois do início.
    this.addSql(`
      do $$ begin
        alter table menu_items add constraint chk_menu_items_promo_window
          check (promo_starts_at is null or promo_ends_at is null or promo_ends_at > promo_starts_at);
      exception when duplicate_object then null; end $$;
    `);
  }

  async down(): Promise<void> {
    this.addSql('alter table menu_items drop constraint if exists chk_menu_items_promo_window;');
    this.addSql('alter table menu_items drop constraint if exists chk_menu_items_promo;');
    this.addSql('alter table menu_items drop column if exists promo_ends_at;');
    this.addSql('alter table menu_items drop column if exists promo_starts_at;');
    this.addSql('alter table menu_items drop column if exists promo_price_cents;');
  }
}
