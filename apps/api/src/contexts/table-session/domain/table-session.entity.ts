import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import { Table } from './table.entity';

/**
 * Período em que uma mesa está sendo usada: abre quando alguém senta, fecha
 * quando a conta é paga e a mesa libera. `closedAt = null` significa "sessão
 * aberta" — a migration garante no máximo UMA aberta por mesa (índice parcial).
 */
@Entity({ tableName: 'table_sessions' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class TableSession {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Table, { fieldName: 'table_id', deleteRule: 'cascade', index: true })
  table!: Table;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  openedAt: Date = new Date();

  @Property({ type: 'timestamptz', nullable: true })
  closedAt?: Date;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
