import { Migration } from '@mikro-orm/migrations';

/**
 * Equipe da pessoa, no pedido.
 *
 * Toda conta pertence a alguém de uma equipe (ARCO-ÍRIS, BANDINHA, RECEPÇÃO…),
 * e o balcão precisa disso para desempatar homônimos e para fechar por equipe.
 * Guardado como texto, não como FK: a lista de equipes é da operação e muda sem
 * release da API. Nulo é permitido — contas abertas antes desta mudança
 * continuam válidas.
 */
export class Migration20260731000009OrderTeamName extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table orders add column if not exists team_name varchar(60) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table orders drop column if exists team_name;');
  }
}
