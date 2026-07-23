import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';

/** Categoria do cardápio (Pratos principais, Bebidas...). Escopada por marca. */
@Entity({ tableName: 'menu_categories' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class Category {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @Property({ length: 120 })
  name!: string;

  @Property({ default: 0 })
  sortOrder = 0;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
