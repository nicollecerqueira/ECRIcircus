import type { QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

/**
 * Diner real-time: a diner may only follow their own order room. On item/order
 * events we invalidate the tracked order's query so the track page updates live.
 *
 * Conecta sem token: o cliente é anônimo desde que o QR de mesa saiu, e a sala
 * que ele acompanha é a do próprio pedido, cujo id ele acabou de receber.
 */
class RealtimeService {
  private socket: Socket | null = null;
  private orderId: string | null = null;

  constructor(private readonly qc: QueryClient) {}

  connect() {
    if (this.socket) {
      return;
    }
    this.socket = io({ path: '/realtime', auth: { token: '' }, transports: ['websocket'] });
    this.socket.on('connect', () => {
      if (this.orderId) {
        this.socket?.emit('subscribe', { type: 'order', id: this.orderId });
      }
    });
    const bump = () => {
      if (this.orderId) {
        this.qc.invalidateQueries({ queryKey: ['order', this.orderId] });
      }
    };
    this.socket.on('item.preparing', bump);
    this.socket.on('item.ready', bump);
    this.socket.on('order.updated', bump);
    this.socket.on('order.paid', bump);
  }

  followOrder(orderId: string) {
    this.connect();
    this.orderId = orderId;
    this.socket?.emit('subscribe', { type: 'order', id: orderId });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.orderId = null;
  }
}

let instance: RealtimeService | null = null;

export function initRealtime(qc: QueryClient): RealtimeService {
  instance ??= new RealtimeService(qc);
  return instance;
}

export function realtime(): RealtimeService {
  if (!instance) {
    throw new Error('Realtime service not initialised.');
  }
  return instance;
}
