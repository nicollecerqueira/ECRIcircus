import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { OrderChannel, PaymentIntent } from './order.model';

const CHANNELS: OrderChannel[] = ['waiter', 'qr', 'pos', 'delivery', 'counter'];
const PAYMENT_INTENTS: PaymentIntent[] = ['pix', 'cash', 'card', 'account'];

export class CreateOrderDto {
  @IsIn(CHANNELS)
  channel!: OrderChannel;

  @IsOptional()
  @IsString()
  tableId?: string;

  /** Nome de quem pediu — identifica a conta quando não há mesa. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  customerName?: string;

  /** Equipe a que a pessoa pertence. Texto livre aqui de propósito: a lista de
      equipes é da operação e muda sem release da API. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  teamName?: string;

  /** Sala onde a pessoa está — destino da entrega. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  deliveryRoom?: string;

  /** Forma de pagamento declarada no app. `account` faz o pedido cair na conta
      já aberta da pessoa, em vez de abrir outra. */
  @IsOptional()
  @IsIn(PAYMENT_INTENTS)
  paymentIntent?: PaymentIntent;

  /** Para pagamento em dinheiro: se o cliente precisa que o caixa leve troco. */
  @IsOptional()
  @IsBoolean()
  cashNeedsChange?: boolean;

  /** Valor em dinheiro que o cliente vai entregar, para calcular o troco. */
  @IsOptional()
  @IsInt()
  @Min(0)
  cashChangeForCents?: number;
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
