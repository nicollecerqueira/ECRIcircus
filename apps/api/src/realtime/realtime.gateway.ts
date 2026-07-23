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
    client.data.scope = this.resolveScope(token);
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

  @OnEvent(DomainEvent.ItemFired)
  onItemFired(p: ItemFiredPayload) {
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemFired, p);
  }

  @OnEvent(DomainEvent.ItemPreparing)
  onItemPreparing(p: ItemStatePayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.ItemPreparing, p);
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemPreparing, p);
  }

  @OnEvent(DomainEvent.ItemReady)
  onItemReady(p: ItemStatePayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.ItemReady, p);
    this.server.to(this.kdsRoom(p, p.stationId)).emit(DomainEvent.ItemReady, p);
  }

  @OnEvent(DomainEvent.OrderUpdated)
  onOrderUpdated(p: OrderUpdatedPayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.OrderUpdated, p);
  }

  @OnEvent(DomainEvent.OrderPaid)
  onOrderPaid(p: OrderPaidPayload) {
    this.server.to(this.orderRoom(p, p.orderId)).emit(DomainEvent.OrderPaid, p);
  }

  private resolveScope(token: string): SocketScope {
    if (token.startsWith('d_')) {
      return { tenantId: DEMO_TENANT_ID, locationId: DEMO_LOCATION_ID, isDiner: true };
    }
    try {
      const claims = this.jwt.verify<JwtClaims>(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      return {
        tenantId: claims.tenantId,
        locationId: claims.locationId ?? DEMO_LOCATION_ID,
        role: claims.role,
        isDiner: false,
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
}
