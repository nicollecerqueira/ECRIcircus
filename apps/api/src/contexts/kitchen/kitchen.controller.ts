import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { KitchenService } from './kitchen.service';

class AdvanceDto {
  @IsIn(['preparing', 'ready'])
  state!: 'preparing' | 'ready';
}

@Controller('kds')
export class KitchenController {
  constructor(private readonly kitchen: KitchenService) {}

  @Roles(Role.Kitchen, Role.LocationManager)
  @Get('stations')
  stations() {
    return this.kitchen.stations();
  }

  @Roles(Role.Kitchen, Role.LocationManager)
  @Get('board')
  board() {
    return this.kitchen.board();
  }

  @Roles(Role.Kitchen, Role.LocationManager)
  @Get('stations/:stationId/board')
  stationBoard() {
    return this.kitchen.board();
  }

  @Roles(Role.Kitchen, Role.LocationManager)
  @Patch('items/:itemId/state')
  advance(@Param('itemId') itemId: string, @Body() dto: AdvanceDto) {
    return this.kitchen.advance(itemId, dto.state);
  }
}
