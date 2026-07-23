import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { SessionModule } from '../table-session/session.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [OrderModule, SessionModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
