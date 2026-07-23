import { randomUUID } from 'node:crypto';
import { Collection, Entity, OneToMany, PrimaryKey, Property } from '@mikro-orm/core';
import { Location } from './location.entity';

/**
 * Brand É o tenant. Uma marca de restaurante = um inquilino do SaaS.
 *
 * Por isso esta tabela NÃO carrega `tenant_id` nem o filtro global: ela é a raiz
 * da hierarquia, não um dado escopado. Toda tabela de negócio abaixo dela aponta
 * para cá via `tenant_id`.
 */
@Entity({ tableName: 'brands' })
export class Brand {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 60, unique: true })
  slug!: string;

  @OneToMany(
    () => Location,
    (l) => l.tenant,
  )
  locations = new Collection<Location>(this);

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
