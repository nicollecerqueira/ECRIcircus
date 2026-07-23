import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from './brand.entity';
import { Location } from './location.entity';

/**
 * Usuário de staff. Diners do QR NÃO são usuários — recebem um token anônimo
 * escopado à mesa (business-rules.md).
 */
@Entity({ tableName: 'users' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class User {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  /** Staff de uma unidade específica; nulo para papéis que abrangem a marca. */
  @ManyToOne(() => Location, { fieldName: 'location_id', nullable: true, deleteRule: 'set null' })
  location?: Location;

  /**
   * Único no sistema todo, não por tenant: o login é só por e-mail + senha, então
   * e-mail repetido entre marcas tornaria a autenticação ambígua. Se um dia o
   * mesmo e-mail precisar existir em duas marcas, o login passa a exigir a marca.
   */
  @Property({ length: 160, unique: true })
  email!: string;

  @Property({ length: 120 })
  passwordHash!: string;

  @Property({ length: 120 })
  name!: string;

  @Property({ length: 40 })
  role!: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
