import { MikroORM } from '@mikro-orm/core';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../auth/roles';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID } from '../../stub/seed';
import { Brand } from './domain/brand.entity';
import { Location } from './domain/location.entity';
import { User } from './domain/user.entity';

/** Segunda marca — existe para o teste de isolamento ter um "vizinho" real. */
export const TENANT_B_ID = '33333333-3333-3333-3333-333333333333';
export const LOCATION_B_ID = '44444444-4444-4444-4444-444444444444';

export const DEMO_PASSWORD = 'prato123';

interface SeedUser {
  email: string;
  name: string;
  role: string;
}

const BRAND_A_USERS: SeedUser[] = [
  { email: 'owner@demo.prato.app', name: 'Ana (Dona)', role: Role.BrandOwner },
  { email: 'manager@demo.prato.app', name: 'Bruno (Gerente)', role: Role.LocationManager },
  { email: 'waiter@demo.prato.app', name: 'Carla (Garçom)', role: Role.Waiter },
  { email: 'cashier@demo.prato.app', name: 'Diego (Caixa)', role: Role.Cashier },
  { email: 'kitchen@demo.prato.app', name: 'Cozinha', role: Role.Kitchen },
];

const BRAND_B_USERS: SeedUser[] = [
  { email: 'owner@bella.prato.app', name: 'Elena (Dona)', role: Role.BrandOwner },
  { email: 'waiter@bella.prato.app', name: 'Fábio (Garçom)', role: Role.Waiter },
];

/**
 * Semeia DUAS marcas distintas no boot. Um tenant só nunca prova isolamento —
 * é preciso existir dado do vizinho para que "não vejo o vizinho" signifique algo.
 */
@Injectable()
export class TenancySeedService implements OnModuleInit {
  private readonly logger = new Logger(TenancySeedService.name);

  constructor(private readonly orm: MikroORM) {}

  async onModuleInit(): Promise<void> {
    const em = this.orm.em.fork();
    // Sem contexto de tenant no boot: o filtro global falharia fechado, então
    // este é um dos poucos pontos com opt-out explícito (ver tenant.filter.ts).
    const existing = await em.count(Brand, {}, { filters: false });
    if (existing > 0) {
      return;
    }

    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 8);

    const brandA = em.create(Brand, {
      id: DEMO_TENANT_ID,
      name: 'Prato Demo',
      slug: 'demo',
      createdAt: new Date(),
    });
    const locationA = em.create(Location, {
      id: DEMO_LOCATION_ID,
      tenant: brandA,
      name: 'Unidade Centro',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      createdAt: new Date(),
    });

    const brandB = em.create(Brand, {
      id: TENANT_B_ID,
      name: 'Cantina Bella',
      slug: 'bella',
      createdAt: new Date(),
    });
    const locationB = em.create(Location, {
      id: LOCATION_B_ID,
      tenant: brandB,
      name: 'Bella Jardins',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      createdAt: new Date(),
    });

    for (const u of BRAND_A_USERS) {
      em.create(User, {
        tenant: brandA,
        location: locationA,
        email: u.email.toLowerCase(),
        passwordHash,
        name: u.name,
        role: u.role,
        createdAt: new Date(),
      });
    }
    for (const u of BRAND_B_USERS) {
      em.create(User, {
        tenant: brandB,
        location: locationB,
        email: u.email.toLowerCase(),
        passwordHash,
        name: u.name,
        role: u.role,
        createdAt: new Date(),
      });
    }

    await em.flush();
    this.logger.log('Seed de tenancy criado: 2 marcas (demo, bella)');
  }
}
