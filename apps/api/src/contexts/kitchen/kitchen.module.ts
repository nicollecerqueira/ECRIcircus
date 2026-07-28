import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { SessionModule } from '../table-session/session.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { Station } from './domain/station.entity';
import { KitchenController } from './kitchen.controller';
import { StationSeedService } from './kitchen.seed';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [TenancyModule, OrderModule, SessionModule, MikroOrmModule.forFeature([Station])],
  controllers: [KitchenController],
  providers: [KitchenService, StationSeedService],
})
export class KitchenModule {}
