import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from './brand.entity';

/** Unidade/filial de uma marca. Escopada por tenant (= brand). */
@Entity({ tableName: 'locations' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Location {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  /** Coluna `tenant_id` — o filtro global casa por esta propriedade. */
  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @Property({ length: 120 })
  name!: string;

  /** Timezone por location — nunca assuma um fuso único (architecture.md). */
  @Property({ length: 60, default: 'America/Sao_Paulo' })
  timezone = 'America/Sao_Paulo';

  @Property({ length: 3, default: 'BRL' })
  currency = 'BRL';

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
