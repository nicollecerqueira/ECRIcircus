import { EntityManager } from '@mikro-orm/postgresql';
import { Controller, Get } from '@nestjs/common';
import { currentTenant } from '../../common/tenant/tenant-context';
import { Location } from './domain/location.entity';
import { User } from './domain/user.entity';

/**
 * Leituras escopadas por tenant. Repare que NENHUMA consulta aqui escreve
 * `where tenant_id = ...`: o filtro global do MikroORM injeta isso sozinho a
 * partir do contexto da requisição. É esse comportamento que o teste de
 * isolamento verifica.
 */
@Controller()
export class TenancyController {
  constructor(private readonly em: EntityManager) {}

  @Get('me')
  async me() {
    const ctx = currentTenant();
    const user = await this.em.findOneOrFail(User, { id: ctx.userId }, { populate: ['tenant'] });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
    };
  }

  @Get('locations')
  async locations() {
    const locations = await this.em.find(Location, {});
    return locations.map((l) => ({
      id: l.id,
      name: l.name,
      timezone: l.timezone,
      currency: l.currency,
    }));
  }

  @Get('staff')
  async staff() {
    const users = await this.em.find(User, {});
    return users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }
}
