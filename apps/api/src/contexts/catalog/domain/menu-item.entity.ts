import { randomUUID } from 'node:crypto';
import { Entity, Filter, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { TENANT_FILTER, tenantFilterCond } from '../../../common/tenant/tenant.filter';
import { Brand } from '../../tenancy/domain/brand.entity';
import { Category } from './category.entity';

/**
 * Item do cardápio. Escopado por MARCA, não por unidade: as filiais compartilham
 * o catálogo da marca (context.md). A disponibilidade por unidade — "hoje acabou
 * a picanha na filial do centro" — é um refinamento posterior; por ora `available`
 * vale para a marca inteira.
 */
@Entity({ tableName: 'menu_items' })
@Filter({ name: TENANT_FILTER, cond: tenantFilterCond, default: true })
export class MenuItem {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Brand, { fieldName: 'tenant_id', deleteRule: 'cascade', index: true })
  tenant!: Brand;

  @ManyToOne(() => Category, { fieldName: 'category_id', deleteRule: 'cascade', index: true })
  category!: Category;

  @Property({ length: 160 })
  name!: string;

  /** Dinheiro é SEMPRE inteiro em centavos — nunca float (business-rules.md). */
  @Property()
  priceCents!: number;

  /** Combo vendido como um item único, com composição descrita no cardápio. */
  @Property({ default: false })
  isCombo = false;

  /** Texto livre da composição do combo (ex.: "Hambúrguer + batata + refri"). */
  @Property({ type: 'text', nullable: true })
  comboItems?: string;

  /**
   * Se o item passa pela cozinha. `false` é o caso da FICHA: crédito comprado no
   * balcão, sem nada a preparar nem a entregar — ele entra na conta e no
   * relatório, mas nunca vira comanda no KDS.
   */
  @Property({ default: true })
  requiresPreparation = true;

  @Property({ default: true })
  available = true;

  /**
   * Preço promocional, também em centavos. Fixo, não percentual: percentual
   * arredondaria item a item e erro de arredondamento no dinheiro só aparece no
   * fechamento do caixa. Nulo = sem promoção.
   */
  @Property({ nullable: true })
  promoPriceCents?: number;

  /** Janela opcional. Nulo em qualquer ponta = sem limite daquele lado. */
  @Property({ type: 'timestamptz', nullable: true })
  promoStartsAt?: Date;

  @Property({ type: 'timestamptz', nullable: true })
  promoEndsAt?: Date;

  /**
   * Estação de destino na cozinha (grelha/bar/sobremesa). Ainda é um texto solto
   * apontando para as estações em memória — vira FK quando o contexto Kitchen
   * ganhar tabela própria.
   */
  @Property({ length: 60 })
  stationId!: string;

  @Property({ type: 'timestamptz', defaultRaw: 'now()' })
  createdAt: Date = new Date();
}
