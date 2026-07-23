import { Module } from '@nestjs/common';
import { OrderModule } from '../order/order.module';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';

@Module({
  imports: [OrderModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
