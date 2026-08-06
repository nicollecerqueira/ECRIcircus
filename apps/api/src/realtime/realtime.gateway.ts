import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtClaims } from '../auth/jwt.strategy';
import { DINER_ROLE } from '../auth/roles';
import {
  DomainEvent,
  type ItemFiredPayload,
  type ItemStatePayload,
  type OrderPaidPayload,
  type OrderUpdatedPayload,
  type ScopedPayload,
} from '../common/events/domain-events';
import { DEMO_LOCATION_ID, DEMO_TENANT_ID } from '../stub/seed';

interface SocketScope {
  tenantId: string;
  locationId: string;
  role?: string;
  isDiner: boolean;
}

/**
 * Real-time spine. Domain events (via EventEmitter) are forwarded to the correct
 * tenant+location+station/order room. Socket messages invalidate React Query
 * caches on the client — they don't carry the source of truth (docs/event-contracts.md).
 * The Redis adapter (attached in main.ts) fans events across API instances.
 */
@WebSocketGateway({ path: '/realtime', cors: { origin: true, credentials: true } })
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token as string | undefined) ?? '';
    const scope = this.resolveScope(token);
    client.data.scope = scope;

    // Staff entra automaticamente na sala da UNIDADE. Sem ela, quem olha uma
    // LISTA (salão, caixa) só recebia evento dos pedidos que ele mesmo abriu
    // naquela aba — a conta que o cliente mexeu pelo app mudava no banco e a
    // tela seguia mostrando o estado antigo até o refetch lento. Não há o que
    // assinar: quem é staff acompanha a unidade inteira, é o trabalho dele.
    //
    // Diner fica de fora: ele só pode seguir a própria conta, e a sala da
    // unidade carrega evento de toda a operação.
    if (!scope.isDiner) {
      client.join(this.ordersRoom(scope));
    }
  }

  // Client asks to follow a KDS station or an order. Scope is enforced from the token.
  @SubscribeMessage('subscribe')
  subscribe(client: Socket, body: { type: 'kds' | 'order'; id: string }) {
    const scope = client.data.scope as SocketScope | undefined;
    if (!scope) {
      return { ok: false, error: 'unauthenticated' };
    }
    const room = this.roomFor(scope, body.type, body.id);
    // Diners may only follow their own order room, never KDS.
    if (scope.isDiner && body.type !== 'order') {
      return { ok: false, error: 'forbidden' };
    }
    client.join(room);
    return { ok: true, room };
  }

  @SubscribeMessage('unsubscribe')
  unsubscribe(client: Socket, body: { type: 'kds' | 'order'; id: string }) {
    const scope = client.data.scope as SocketScope | undefined;
    if (scope) {
      client.leave(this.roomFor(scope, body.type, body.id));
    }
    return { ok: true };
  }

  // Cada evento vai TAMBÉM para a sala da unidade: qualquer um deles muda o que
  // o cartão da conta mostra no salão e no caixa (itens, total, status, sala,
  // forma de pagamento). Quem assina a conta específica continua recebendo como
  // antes — a sala da unidade é adicional, não substituta.

  @OnEvent(DomainEvent.ItemFired)
  onItemFired(p: ItemFiredPayload) {
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemFired, p);
    this.server.to(this.kdsRoom(p, 'all')).emit(DomainEvent.ItemFired, p);
    this.server.to(this.ordersRoom(p)).emit(DomainEvent.ItemFired, p);
  }

  @OnEvent(DomainEvent.ItemPreparing)
  onItemPreparing(p: ItemStatePayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.ItemPreparing, p);
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemPreparing, p);
    this.server.to(this.kdsRoom(p, 'all')).emit(DomainEvent.ItemPreparing, p);
    this.server.to(this.ordersRoom(p)).emit(DomainEvent.ItemPreparing, p);
  }

  @OnEvent(DomainEvent.ItemReady)
  onItemReady(p: ItemStatePayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.ItemReady, p);
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemReady, p);
    this.server.to(this.kdsRoom(p, 'all')).emit(DomainEvent.ItemReady, p);
    this.server.to(this.ordersRoom(p)).emit(DomainEvent.ItemReady, p);
  }

  @OnEvent(DomainEvent.OrderUpdated)
  onOrderUpdated(p: OrderUpdatedPayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.OrderUpdated, p);
    this.server.to(this.ordersRoom(p)).emit(DomainEvent.OrderUpdated, p);
  }

  @OnEvent(DomainEvent.OrderPaid)
  onOrderPaid(p: OrderPaidPayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.OrderPaid, p);
    this.server.to(this.ordersRoom(p)).emit(DomainEvent.OrderPaid, p);
  }

  private resolveScope(token: string): SocketScope {
    try {
      // Staff e diner usam o MESMO fluxo: um JWT assinado. O diner se distingue
      // pelo papel — e o escopo (tenant/location) vem das claims, nunca fixo.
      const claims = this.jwt.verify<JwtClaims>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      return {
        tenantId: claims.tenantId,
        locationId: claims.locationId ?? DEMO_LOCATION_ID,
        role: claims.role,
        isDiner: claims.role === DINER_ROLE,
      };
    } catch {
      // Skeleton fallback: attach to the demo tenant so local dev "just works".
      this.logger.debug('Socket connected without a valid token — using demo scope');
      return { tenantId: DEMO_TENANT_ID, locationId: DEMO_LOCATION_ID, isDiner: false };
    }
  }

  private roomFor(scope: SocketScope, type: 'kds' | 'order', id: string) {
    return type === 'kds' ? this.kdsRoom(scope, id) : this.orderRoom(scope, id);
  }

  private kdsRoom(s: ScopedPayload | SocketScope, stationId: string) {
    return `tenant:${s.tenantId}:location:${s.locationId}:kds:${stationId}`;
  }

  private orderRoom(s: ScopedPayload | SocketScope, orderId: string) {
    return `tenant:${s.tenantId}:location:${s.locationId}:order:${orderId}`;
  }

  /** Sala da unidade: tudo que mexe em QUALQUER conta dela. É o que as telas de
      lista (salão, caixa) precisam ouvir — elas mostram todas as contas, não uma. */
  private ordersRoom(s: ScopedPayload | SocketScope) {
    return `tenant:${s.tenantId}:location:${s.locationId}:orders`;
  }
}
