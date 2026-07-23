/**
 * Domain event names + payload shapes (mirrors docs/event-contracts.md).
 * Emitted via @nestjs/event-emitter; the RealtimeGateway forwards them to sockets.
 * Every payload carries tenantId + locationId.
 */

export const DomainEvent = {
  ItemFired: 'item.fired',
  ItemPreparing: 'item.preparing',
  ItemReady: 'item.ready',
  OrderUpdated: 'order.updated',
  OrderPaid: 'order.paid',
} as const;

export interface ScopedPayload {
  tenantId: string;
  locationId: string;
}

export interface ItemFiredPayload extends ScopedPayload {
  stationId: string;
  orderId: string;
  itemId: string;
  name: string;
  qty: number;
  notes?: string;
}

export interface ItemStatePayload extends ScopedPayload {
  stationId: string;
  orderId: string;
  itemId: string;
}

export interface OrderUpdatedPayload extends ScopedPayload {
  orderId: string;
  status: string;
}

export interface OrderPaidPayload extends ScopedPayload {
  orderId: string;
}
