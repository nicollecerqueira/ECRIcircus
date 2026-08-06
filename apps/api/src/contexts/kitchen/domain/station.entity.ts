import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';

/**
 * Estação de preparo da cozinha (Grelha, Bar, Sobremesas...). Escopada por marca.
 *
 * O `code` (ex.: "st-lanches") é o identificador ESTÁVEL exposto na API e usado por
 * cardápio, itens de pedido e salas do KDS. A PK é UUID (padrão), mas nunca vaza:
 * quem referencia estação usa o code. Assim virar tabela não quebra nada.
 */
@Entity({ tableName: 'stations' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Station {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  /** Código estável (ex.: "st-lanches"). Único por marca. */
  @Property({ length: 40 })
  code!: string;

  @Property({ length: 60 })
  name!: string;

  @Property({ length: 30 })
  kind!: string;

  @Property({ default: 0 })
  sortOrder = 0;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
