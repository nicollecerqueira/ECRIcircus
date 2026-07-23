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

const BRAND_A_MENU: SeedCategory[] = [
  {
    name: 'Pratos principais',
    sortOrder: 1,
    items: [
      { name: 'Hambúrguer artesanal', priceCents: 3200, stationId: 'st-grill' },
      { name: 'Picanha na chapa', priceCents: 5800, stationId: 'st-grill' },
      { name: 'Batata frita', priceCents: 1800, stationId: 'st-grill' },
    ],
  },
  {
    name: 'Bebidas',
    sortOrder: 2,
    items: [
      { name: 'Refrigerante', priceCents: 900, stationId: 'st-bar' },
      { name: 'Chopp', priceCents: 1400, stationId: 'st-bar' },
      { name: 'Suco natural', priceCents: 1200, stationId: 'st-bar', available: false },
    ],
  },
  {
    name: 'Sobremesas',
    sortOrder: 3,
    items: [{ name: 'Pudim', priceCents: 1600, stationId: 'st-dessert' }],
  },
];

/** Cardápio deliberadamente diferente: torna visível se um tenant vazar no outro. */
const BRAND_B_MENU: SeedCategory[] = [
  {
    name: 'Massas',
    sortOrder: 1,
    items: [
      { name: 'Cacio e pepe', priceCents: 4900, stationId: 'st-grill' },
      { name: 'Lasanha da nonna', priceCents: 5400, stationId: 'st-grill' },
    ],
  },
  {
    name: 'Vinhos',
    sortOrder: 2,
    items: [{ name: 'Chianti (taça)', priceCents: 2600, stationId: 'st-bar' }],
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
          stationId: item.stationId,
          available: item.available ?? true,
          createdAt: new Date(),
        });
      }
    }
  }
}
