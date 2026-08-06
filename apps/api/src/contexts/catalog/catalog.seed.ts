import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DEMO_TENANT_ID } from '../../stub/seed';
import { Brand } from '../tenancy/domain/brand.entity';
import { TENANT_B_ID } from '../tenancy/tenancy.seed';
import { Category } from './domain/category.entity';
import { MenuItem } from './domain/menu-item.entity';

interface SeedCategory {
  name: string;
  sortOrder: number;
  items: { name: string; priceCents: number; stationId: string; available?: boolean }[];
}

/**
 * Cardápio de PARTIDA da cantina do ECRI — só existe para o banco novo não nascer
 * vazio (app sem item nenhum parece app quebrado). Itens, preços e combos do
 * evento se ajustam na tela de admin (`/admin/menu`), que grava no banco; mexer
 * aqui depois disso não muda nada, porque o seed só roda em banco vazio.
 */
const BRAND_A_MENU: SeedCategory[] = [
  {
    name: 'Lanches',
    sortOrder: 1,
    items: [
      { name: 'Cachorro-quente', priceCents: 800, stationId: 'st-lanches' },
      { name: 'Misto quente', priceCents: 600, stationId: 'st-lanches' },
      { name: 'Pastel', priceCents: 700, stationId: 'st-lanches' },
      { name: 'Pipoca', priceCents: 500, stationId: 'st-lanches' },
    ],
  },
  {
    name: 'Bebidas',
    sortOrder: 2,
    items: [
      { name: 'Refrigerante lata', priceCents: 500, stationId: 'st-bebidas' },
      { name: 'Suco', priceCents: 400, stationId: 'st-bebidas' },
      { name: 'Água', priceCents: 300, stationId: 'st-bebidas' },
    ],
  },
  {
    name: 'Doces',
    sortOrder: 3,
    items: [
      { name: 'Algodão doce', priceCents: 500, stationId: 'st-doces' },
      { name: 'Picolé', priceCents: 400, stationId: 'st-doces' },
      { name: 'Brigadeiro', priceCents: 300, stationId: 'st-doces' },
    ],
  },
];

/** Cardápio deliberadamente diferente: torna visível se um tenant vazar no outro. */
const BRAND_B_MENU: SeedCategory[] = [
  {
    name: 'Salgados do vizinho',
    sortOrder: 1,
    items: [
      { name: 'Espetinho', priceCents: 1200, stationId: 'st-lanches' },
      { name: 'Caldo', priceCents: 1000, stationId: 'st-lanches' },
    ],
  },
  {
    name: 'Bebidas do vizinho',
    sortOrder: 2,
    items: [{ name: 'Chá gelado', priceCents: 600, stationId: 'st-bebidas' }],
  },
];

@Injectable()
export class CatalogSeedService implements OnModuleInit {
  private readonly logger = new Logger(CatalogSeedService.name);

  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    const em = this.orm.em.fork();
    // Boot não tem contexto de tenant: opt-out explícito do filtro global.
    const existing = await em.count(MenuItem, {}, { filters: false });
    if (existing > 0) {
      return;
    }

    await this.seedBrand(em, DEMO_TENANT_ID, BRAND_A_MENU);
    await this.seedBrand(em, TENANT_B_ID, BRAND_B_MENU);
    await em.flush();
    this.logger.log('Seed de cardápio criado para as 2 marcas');
  }

  private async seedBrand(
    em: ReturnType<MikroORM['em']['fork']>,
    tenantId: string,
    menu: SeedCategory[],
  ): Promise<void> {
    const brand = await em.findOne(Brand, { id: tenantId });
    if (!brand) {
      this.logger.warn(`Marca ${tenantId} inexistente — cardápio não semeado`);
      return;
    }
    for (const cat of menu) {
      const category = em.create(Category, {
        tenant: brand,
        name: cat.name,
        sortOrder: cat.sortOrder,
        createdAt: new Date(),
      });
      for (const item of cat.items) {
        em.create(MenuItem, {
          tenant: brand,
          category,
          name: item.name,
          priceCents: item.priceCents,
          isCombo: false,
          stationId: item.stationId,
          available: item.available ?? true,
          createdAt: new Date(),
        });
      }
    }
  }
}
