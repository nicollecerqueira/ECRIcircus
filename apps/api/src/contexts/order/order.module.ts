import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { Order } from './domain/order.entity';
import { OrderItem } from './domain/order-item.entity';
import { Payment } from './domain/payment.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [TenancyModule, CatalogModule, MikroOrmModule.forFeature([Order, OrderItem, Payment])],
  controllers: [OrderController, ReportController],
  providers: [OrderService, ReportService],
  exports: [OrderService],
})
export class OrderModule {}
