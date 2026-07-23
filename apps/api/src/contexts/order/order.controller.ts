import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from '../../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { AddItemDto, CreateOrderDto, VoidItemDto } from './dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  list() {
    return this.orders.list();
  }

  // Public: QR diners create/read their own order via the table session token.
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.orders.get(id);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orders.create(dto);
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: AddItemDto) {
    return this.orders.addItem(id, dto);
  }

  @Roles(Role.Waiter, Role.LocationManager, Role.BrandOwner)
  @Patch(':id/items/:itemId/void')
  voidItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() dto: VoidItemDto) {
    return this.orders.voidItem(id, itemId, dto.reason);
  }

  @Post(':id/request-payment')
  requestPayment(@Param('id') id: string) {
    return this.orders.requestPayment(id);
  }

  @Roles(Role.Cashier, Role.LocationManager, Role.BrandOwner)
  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.orders.close(id);
  }
}
