import { Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { ServerOptions } from 'socket.io';

/**
 * Socket.IO adapter backed by Redis pub/sub so events fan out across all API
 * instances behind the load balancer. If Redis is unreachable (local skeleton dev
 * without the container), we fall back to the default in-memory adapter.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connect(redisUrl: string): Promise<boolean> {
    const pub = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null, // don't keep retrying in the skeleton
    });
    const sub = pub.duplicate();
    // Swallow connection errors so an absent Redis (local dev) doesn't spam logs.
    pub.on('error', () => undefined);
    sub.on('error', () => undefined);
    try {
      await pub.connect();
      await sub.connect();
      this.adapterConstructor = createAdapter(pub, sub);
      this.logger.log('Socket.IO Redis adapter connected');
      return true;
    } catch {
      pub.disconnect();
      sub.disconnect();
      this.logger.warn('Redis unavailable — using in-memory Socket.IO adapter (single instance)');
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
