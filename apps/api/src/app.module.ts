import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { CatalogModule } from './contexts/catalog/catalog.module';
import { KitchenModule } from './contexts/kitchen/kitchen.module';
import { OrderModule } from './contexts/order/order.module';
import { PaymentModule } from './contexts/payment/payment.module';
import { SessionModule } from './contexts/table-session/session.module';
import { TenancyModule } from './contexts/tenancy/tenancy.module';
import mikroOrmConfig from './mikro-orm.config';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Structured logs with tenantId on every line (Avenir standard, Pino).
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    EventEmitterModule.forRoot(),
    // Fase 1: Postgres real para Tenancy & Identity. Os demais contextos ainda
    // rodam sobre dados em memória (stub/) — migram nas fases seguintes.
    MikroOrmModule.forRoot(mikroOrmConfig),
    TenancyModule,
    AuthModule,
    CatalogModule,
    SessionModule,
    OrderModule,
    KitchenModule,
    PaymentModule,
    RealtimeModule,
  ],
  providers: [
    // Global auth: JWT required unless @Public(); then role + tenant scoping.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
