import 'reflect-metadata';
import { MikroORM } from '@mikro-orm/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  // Migrations idempotentes rodam no boot (padrão Nexus) — antes de servir tráfego.
  await app.get(MikroORM).getMigrator().up();

  // REST under /api/v1 (backend.md); WS gateway mounts on /realtime.
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // CORS for the three web app dev origins.
  app.enableCors({
    origin: [
      config.get<string>('WEB_STAFF_ORIGIN') ?? 'http://localhost:5173',
      config.get<string>('WEB_KDS_ORIGIN') ?? 'http://localhost:5174',
      config.get<string>('WEB_ORDER_ORIGIN') ?? 'http://localhost:5175',
    ],
    credentials: true,
  });

  // Redis-backed Socket.IO (falls back to in-memory if Redis is down).
  const redisAdapter = new RedisIoAdapter(app);
  await redisAdapter.connect(config.get<string>('REDIS_URL') ?? 'redis://localhost:56379');
  app.useWebSocketAdapter(redisAdapter);

  const port = Number(config.get('PORT') ?? 3000);
  await app.listen(port);
  app.get(Logger).log(`Prato API on http://localhost:${port}/api/v1`);
}

void bootstrap();
