import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DEMO_TENANT_ID } from '../../stub/seed';
import { Brand } from '../tenancy/domain/brand.entity';
import { TENANT_B_ID } from '../tenancy/tenancy.seed';
import { Station } from './domain/station.entity';

/** Códigos ESTÁVEIS — os mesmos que cardápio, pedidos e salas do KDS já usam. */
const STATIONS = [
  { code: 'st-grill', name: 'Grelha', kind: 'grill', sortOrder: 1 },
  { code: 'st-bar', name: 'Bar', kind: 'bar', sortOrder: 2 },
  { code: 'st-dessert', name: 'Sobremesas', kind: 'dessert', sortOrder: 3 },
];

/** Semeia as 3 estações para cada marca (idempotente). */
@Injectable()
export class StationSeedService implements OnModuleInit {
  private readonly logger = new Logger(StationSeedService.name);

  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    const em = this.orm.em.fork();
    // Boot não tem contexto de tenant: opt-out explícito do filtro global.
    const existing = await em.count(Station, {}, { filters: false });
    if (existing > 0) {
      return;
    }
    for (const tenantId of [DEMO_TENANT_ID, TENANT_B_ID]) {
      const brand = await em.findOne(Brand, { id: tenantId }, { filters: false });
      if (!brand) {
        this.logger.warn(`Marca ${tenantId} inexistente — estações não semeadas`);
        continue;
      }
      for (const s of STATIONS) {
        em.create(Station, { tenant: brand, ...s, createdAt: new Date() });
      }
    }
    await em.flush();
    this.logger.log('Seed de estações criado para as 2 marcas');
  }
}
