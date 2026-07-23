import type { QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from './auth.store';

/**
 * KDS real-time. Station events invalidate the station board query (['kds', id]);
 * the board refetches via REST. Sockets never carry the source of truth.
 */
class RealtimeService {
  private socket: Socket | null = null;
  private stations = new Set<string>();

  constructor(private readonly qc: QueryClient) {}

  connect() {
    if (this.socket) {
      return;
    }
    const token = useAuthStore.getState().accessToken ?? '';
    this.socket = io({ path: '/realtime', auth: { token }, transports: ['websocket'] });

    this.socket.on('connect', () => {
      for (const id of this.stations) {
        this.socket?.emit('subscribe', { type: 'kds', id });
      }
      this.qc.invalidateQueries({ queryKey: ['kds'] });
    });

    const bump = (p: { stationId?: string }) => {
      if (p.stationId) {
        this.qc.invalidateQueries({ queryKey: ['kds', p.stationId] });
      } else {
        this.qc.invalidateQueries({ queryKey: ['kds'] });
      }
    };
    this.socket.on('item.fired', bump);
    this.socket.on('item.preparing', bump);
    this.socket.on('item.ready', bump);
  }

  subscribeStation(id: string) {
    this.stations.add(id);
    this.socket?.emit('subscribe', { type: 'kds', id });
  }

  unsubscribeStation(id: string) {
    this.stations.delete(id);
    this.socket?.emit('unsubscribe', { type: 'kds', id });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.stations.clear();
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
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
