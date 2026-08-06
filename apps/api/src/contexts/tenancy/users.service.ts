import { EntityManager } from '@mikro-orm/postgresql';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { currentTenant } from '../../common/tenant/tenant-context';
import { Brand } from './domain/brand.entity';
import { Location } from './domain/location.entity';
import { User } from './domain/user.entity';
import type { CreateUserDto, UpdateUserDto } from './users.dto';

export interface UserView {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

/** O hash NUNCA sai daqui — nem para o dono. */
function toView(user: User): UserView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Gestão das contas de staff — só o dono chega aqui (ver users.controller).
 *
 * As consultas não escrevem `where tenant_id`: o filtro global recorta pela
 * marca do JWT sozinho, então um dono nunca alcança usuário de outra marca.
 */
@Injectable()
export class UsersService {
  constructor(private readonly em: EntityManager) {}

  async list(): Promise<UserView[]> {
    const users = await this.em.find(User, {}, { orderBy: { createdAt: 'asc' } });
    return users.map(toView);
  }

  async create(dto: CreateUserDto): Promise<UserView> {
    const ctx = currentTenant();
    const email = dto.email.trim().toLowerCase();

    // O e-mail é único no sistema INTEIRO (ver user.entity), então a checagem
    // ignora o filtro de marca: sem isso, um e-mail já usado por outra marca
    // passaria daqui e estouraria como erro 500 no unique do banco, sem dizer
    // à pessoa o que houve.
    const taken = await this.em.count(User, { email }, { filters: false });
    if (taken > 0) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const tenant = await this.em.findOneOrFail(Brand, { id: ctx.tenantId }, { filters: false });
    const location = ctx.locationId
      ? ((await this.em.findOne(Location, { id: ctx.locationId })) ?? undefined)
      : undefined;

    const user = this.em.create(User, {
      tenant,
      location,
      email,
      name: dto.name.trim(),
      passwordHash: bcrypt.hashSync(dto.password, 8),
      role: dto.role,
      createdAt: new Date(),
    });
    await this.em.flush();
    return toView(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserView> {
    const ctx = currentTenant();
    const user = await this.findInTenant(id);

    // Rebaixar a si mesmo tranca o dono para fora do próprio admin — e não há
    // outra porta para voltar, porque só o dono entra aqui. Trocar o próprio
    // nome e a própria senha segue permitido: nada disso derruba o acesso.
    if (id === ctx.userId && dto.role && dto.role !== user.role) {
      throw new ForbiddenException('Você não pode mudar o próprio papel.');
    }

    if (dto.name !== undefined) {
      user.name = dto.name.trim();
    }
    if (dto.role !== undefined) {
      user.role = dto.role;
    }
    if (dto.password !== undefined) {
      user.passwordHash = bcrypt.hashSync(dto.password, 8);
    }
    await this.em.flush();
    return toView(user);
  }

  async remove(id: string): Promise<{ id: string }> {
    const ctx = currentTenant();
    if (id === ctx.userId) {
      throw new ForbiddenException('Você não pode remover a própria conta.');
    }
    const user = await this.findInTenant(id);
    await this.em.removeAndFlush(user);
    return { id };
  }

  /**
   * Conta desta marca, ou 404.
   *
   * `findOneOrFail` do MikroORM lança um erro que o Nest não traduz — virava 500
   * e ia para o log como falha do servidor, quando na verdade é id que não existe
   * (ou é de outra marca, que o filtro global faz não existir para quem pergunta).
   */
  private async findInTenant(id: string): Promise<User> {
    const user = await this.em.findOne(User, { id });
    if (!user) {
      throw new NotFoundException('Conta não encontrada.');
    }
    return user;
  }
}
