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

export const SEED_PASSWORD = 'ecri123';

interface SeedUser {
  email: string;
  name: string;
  role: string;
}

/**
 * Contas de partida da operação do ECRI. São por FUNÇÃO, não por pessoa: quem
 * fica no balcão muda a cada evento, e uma conta chamada "Carla" que hoje é
 * usada pelo João só atrapalha na hora de saber quem lançou o quê.
 */
const BRAND_A_USERS: SeedUser[] = [
  { email: 'owner@ecricircus.app', name: 'Direção', role: Role.BrandOwner },
  { email: 'manager@ecricircus.app', name: 'Coordenação', role: Role.LocationManager },
  { email: 'waiter@ecricircus.app', name: 'Balcão', role: Role.Waiter },
  { email: 'cashier@ecricircus.app', name: 'Caixa', role: Role.Cashier },
  { email: 'kitchen@ecricircus.app', name: 'Cozinha', role: Role.Kitchen },
];

const BRAND_B_USERS: SeedUser[] = [
  { email: 'owner@vizinho.ecricircus.app', name: 'Direção (vizinho)', role: Role.BrandOwner },
  { email: 'waiter@vizinho.ecricircus.app', name: 'Balcão (vizinho)', role: Role.Waiter },
];

/**
 * Semeia DUAS marcas distintas no boot: o ECRI Circus e um "vizinho". Um tenant
 * só nunca prova isolamento — é preciso existir dado do vizinho para que "não
 * vejo o vizinho" signifique algo.
 *
 * Só roda em banco vazio (`existing > 0` aborta), então trocar estes valores NÃO
 * mexe num banco já semeado: é preciso banco novo — que foi exatamente o motivo
 * de o ECRI passar a ter o seu (ver docker-compose.dev.yml).
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

    const passwordHash = bcrypt.hashSync(SEED_PASSWORD, 8);

    const brandA = em.create(Brand, {
      id: DEMO_TENANT_ID,
      name: 'ECRI Circus',
      slug: 'ecri',
      createdAt: new Date(),
    });
    const locationA = em.create(Location, {
      id: DEMO_LOCATION_ID,
      tenant: brandA,
      name: 'Cantina do Circo',
      timezone: 'America/Sao_Paulo',
      currency: 'BRL',
      createdAt: new Date(),
    });

    const brandB = em.create(Brand, {
      id: TENANT_B_ID,
      name: 'Circo Vizinho',
      slug: 'vizinho',
      createdAt: new Date(),
    });
    const locationB = em.create(Location, {
      id: LOCATION_B_ID,
      tenant: brandB,
      name: 'Barraca do Vizinho',
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
    this.logger.log('Seed de tenancy criado: 2 marcas (ecri, vizinho)');
  }
}
