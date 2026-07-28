import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ALL_ROLES, Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { PaymentMethod } from '../order/order.model';
import { PaymentService } from './payment.service';

const METHODS: PaymentMethod[] = ['cash', 'card', 'pix', 'voucher', 'other'];

class RegisterPaymentDto {
  @IsIn(METHODS)
  method!: PaymentMethod;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

@Controller('orders/:id/payments')
export class PaymentController {
  constructor(private readonly payments: PaymentService) {}

  @Roles(Role.Cashier, Role.Waiter, Role.LocationManager, Role.BrandOwner)
  @Post()
  register(@Param('id') id: string, @Body() dto: RegisterPaymentDto) {
    return this.payments.register(id, dto);
  }

  @Roles(...ALL_ROLES)
  @Get('split')
  splitEvenly(@Param('id') id: string, @Query('parts') parts: string) {
    return this.payments.splitEvenly(id, Number(parts) || 2);
  }

  @Roles(...ALL_ROLES)
  @Get('receipt')
  receipt(@Param('id') id: string) {
    return this.payments.receipt(id);
  }
}
