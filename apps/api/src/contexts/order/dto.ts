import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderChannel } from './order.model';

const CHANNELS: OrderChannel[] = ['waiter', 'qr', 'pos', 'delivery', 'counter'];

export class CreateOrderDto {
  @IsIn(CHANNELS)
  channel!: OrderChannel;

  @IsOptional()
  @IsString()
  tableId?: string;
}

export class AddItemDto {
  @IsString()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  qty!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class VoidItemDto {
  @IsString()
  reason!: string;
}
