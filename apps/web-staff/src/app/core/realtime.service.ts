import type { QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';

/**
 * Socket.IO connection + room subscribe/unsubscribe. Socket messages INVALIDATE
 * React Query caches — they never carry the source of truth (docs/event-contracts.md).
 * REST stays the single read model.
 */
type SubType = 'kds' | 'order';

class RealtimeService {
  private socket: Socket | null = null;
  private rooms = new Set<string>();

  constructor(private readonly qc: QueryClient) {}

  connect() {
    if (this.socket) {
      return;
    }
    const token = useAuthStore.getState().accessToken ?? '';
    this.socket = io({ path: '/realtime', auth: { token }, transports: ['websocket'] });

    this.socket.on('connect', () => {
      // Resubscribe rooms + resync after a reconnect (flaky floor/kitchen wifi).
      for (const key of this.rooms) {
        const [type, id] = key.split(':') as [SubType, string];
        this.socket?.emit('subscribe', { type, id });
      }
      this.qc.invalidateQueries();
    });

    // Todos invalidam a LISTA também: a API põe o staff na sala da unidade, então
    // chega evento de qualquer conta — inclusive das que esta aba nunca abriu, que
    // era justamente o buraco (a conta mexida pelo app do cliente não atualizava).
    const touched = (p: { orderId: string }) => {
      this.qc.invalidateQueries({ queryKey: ['order', p.orderId] });
      this.qc.invalidateQueries({ queryKey: ['orders'] });
    };
    this.socket.on('item.fired', touched);
    this.socket.on('item.ready', touched);
    this.socket.on('item.preparing', touched);
    this.socket.on('order.updated', touched);
    this.socket.on('order.paid', (p: { orderId: string }) => {
      this.qc.invalidateQueries({ queryKey: ['order', p.orderId] });
      this.qc.invalidateQueries({ queryKey: ['orders'] });
      this.qc.invalidateQueries({ queryKey: ['floor'] });
    });
  }

  subscribe(type: SubType, id: string) {
    const key = `${type}:${id}`;
    this.rooms.add(key);
    this.socket?.emit('subscribe', { type, id });
  }

  unsubscribe(type: SubType, id: string) {
    this.rooms.delete(`${type}:${id}`);
    this.socket?.emit('unsubscribe', { type, id });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.rooms.clear();
  }
}

let instance: RealtimeService | null = null;

export function initRealtime(qc: QueryClient): RealtimeService {
  instance ??= new RealtimeService(qc);
  return instance;
}

export function realtime(): RealtimeService {
  if (!instance) {
    throw new Error('Realtime service not initialised — call initRealtime() at bootstrap.');
  }
  return instance;
}
