import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtClaims } from '../../auth/jwt.strategy';
import { DINER_ROLE } from '../../auth/roles';
import { currentTenant } from '../../common/tenant/tenant-context';
import { Table, type TableStatus } from './domain/table.entity';
import { TableSession } from './domain/table-session.entity';

export interface TableView {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  sessionId?: string;
  qrToken: string;
}

// Table & Session context (Fase 3, Postgres). QR binding: cada mesa tem um
// qrToken estável que mapeia {location, table}; escanear abre/anexa a sessão.
@Injectable()
export class SessionService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Salão da unidade atual: mesas + id da sessão aberta (quando houver). */
  async floor(): Promise<TableView[]> {
    const ctx = currentTenant();
    // Filtro global já recorta por tenant; refinamos pela unidade do usuário.
    const where = ctx.locationId ? { location: ctx.locationId } : {};
    const tables = await this.em.find(Table, where, { orderBy: { number: 'asc' } });
    const openSessions = await this.em.find(TableSession, { closedAt: null });
    const openByTable = new Map(openSessions.map((s) => [s.table.id, s.id]));
    return tables.map((t) => ({
      id: t.id,
      number: t.number,
      seats: t.seats,
      status: t.status,
      sessionId: openByTable.get(t.id),
      qrToken: t.qrToken,
    }));
  }

  /** Abre a sessão da mesa (idempotente: se já há uma aberta, devolve ela). */
  async openSession(tableId: string): Promise<{ id: string; tableId: string; openedAt: string }> {
    const table = await this.em.findOne(Table, { id: tableId });
    if (!table) {
      throw new NotFoundException('Mesa não encontrada');
    }
    const session = await this.attachOpenSession(table);
    return { id: session.id, tableId: table.id, openedAt: session.openedAt.toISOString() };
  }

  /** Fecha a sessão aberta e marca a mesa como "a limpar". */
  async closeSession(tableId: string): Promise<{ tableId: string; status: TableStatus }> {
    const table = await this.em.findOne(Table, { id: tableId });
    if (!table) {
      throw new NotFoundException('Mesa não encontrada');
    }
    const session = await this.em.findOne(TableSession, { table, closedAt: null });
    if (session) {
      session.closedAt = new Date();
    }
    table.status = 'dirty';
    await this.em.flush();
    return { tableId: table.id, status: table.status };
  }

  /**
   * Público (QR): resolve o token → mesa e abre/anexa a sessão. Não há JWT, logo
   * não há contexto de tenant na requisição — resolvemos a marca a partir da
   * própria mesa (`filters: false`, escopo derivado do dado, como o cardápio
   * público faz no Catalog).
   */
  async resolveQr(qrToken: string) {
    const table = await this.em.findOne(
      Table,
      { qrToken },
      { filters: false, populate: ['tenant', 'location'] },
    );
    if (!table) {
      throw new NotFoundException('QR inválido');
    }
    const session = await this.attachOpenSession(table, { skipFilters: true });
    // JWT de diner assinado: carrega tenant/location/mesa/sessão. O JwtStrategy
    // valida a assinatura (sem tocar no banco) e o TenantInterceptor monta o
    // contexto a partir dele — então o pedido do QR já nasce na marca certa.
    const claims: JwtClaims = {
      sub: session.id,
      tenantId: table.tenant.id,
      locationId: table.location.id,
      role: DINER_ROLE,
      tableId: table.id,
      sessionId: session.id,
    };
    const dinerToken = this.jwt.sign(claims, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      // Vale por algumas horas (em segundos) — a duração típica de uma refeição.
      expiresIn: Number(this.config.get('JWT_DINER_TTL')) || 6 * 3600,
    });
    return {
      tenantId: table.tenant.id,
      locationId: table.location.id,
      tableId: table.id,
      sessionId: session.id,
      dinerToken,
    };
  }

  /**
   * Mapa id→número das mesas, para rótulos humanos em outros contextos (ex.: o
   * KDS, que é outro app e não tem acesso ao /tables). Escopado por tenant.
   */
  async tableNumbers(ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) {
      return new Map();
    }
    const tables = await this.em.find(Table, { id: { $in: ids } });
    return new Map(tables.map((t) => [t.id, t.number]));
  }

  /** Sessão aberta da mesa, criando uma se não existir. Centraliza a regra. */
  private async attachOpenSession(
    table: Table,
    opts: { skipFilters?: boolean } = {},
  ): Promise<TableSession> {
    const existing = await this.em.findOne(
      TableSession,
      { table, closedAt: null },
      { filters: !opts.skipFilters },
    );
    if (existing) {
      return existing;
    }
    const session = this.em.create(TableSession, {
      tenant: table.tenant,
      table,
      openedAt: new Date(),
      createdAt: new Date(),
    });
    table.status = 'occupied';
    await this.em.flush();
    return session;
  }
}
