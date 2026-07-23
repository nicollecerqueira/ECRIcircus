import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID } from '../../stub/seed';
import { Brand } from '../tenancy/domain/brand.entity';
import { Location } from '../tenancy/domain/location.entity';
import { LOCATION_B_ID, TENANT_B_ID } from '../tenancy/tenancy.seed';
import { Table } from './domain/table.entity';

/**
 * Mesas por unidade. Marca A: 12 mesas; marca B: 6 — deliberadamente diferentes,
 * para o teste de isolamento (um tenant não pode ver o salão do outro).
 */
@Injectable()
export class SessionSeedService implements OnModuleInit {
  private readonly logger = new Logger(SessionSeedService.name);

  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    const em = this.orm.em.fork();
    // Boot não tem contexto de tenant: opt-out explícito do filtro global.
    const existing = await em.count(Table, {}, { filters: false });
    if (existing > 0) {
      return;
    }
    await this.seedTables(em, DEMO_TENANT_ID, DEMO_LOCATION_ID, 12);
    await this.seedTables(em, TENANT_B_ID, LOCATION_B_ID, 6);
    await em.flush();
    this.logger.log('Seed de mesas criado para as 2 unidades');
  }

  private async seedTables(
    em: ReturnType<MikroORM['em']['fork']>,
    tenantId: string,
    locationId: string,
    count: number,
  ): Promise<void> {
    const brand = await em.findOne(Brand, { id: tenantId }, { filters: false });
    const location = await em.findOne(Location, { id: locationId }, { filters: false });
    if (!brand || !location) {
      this.logger.warn(`Marca/unidade ${tenantId} inexistente — mesas não semeadas`);
      return;
    }
    for (let i = 1; i <= count; i++) {
      em.create(Table, {
        tenant: brand,
        location,
        number: i,
        // Mesas pares: 2 lugares; ímpares: 4 (mesma proporção do stub antigo).
        seats: i % 2 === 0 ? 2 : 4,
        qrToken: `q_${locationId}_${i}`,
        status: 'open',
        createdAt: new Date(),
      });
    }
  }
}
