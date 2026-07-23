import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { Public } from '../../auth/jwt-auth.guard';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { SessionService } from './session.service';

class OpenSessionDto {
  @IsString()
  tableId!: string;
}

class ResolveQrDto {
  @IsString()
  qrToken!: string;
}

@Controller()
export class SessionController {
  constructor(private readonly sessions: SessionService) {}

  @Roles(Role.Waiter, Role.Cashier, Role.LocationManager, Role.BrandOwner)
  @Get('tables')
  floor() {
    return this.sessions.floor();
  }

  @Roles(Role.Waiter, Role.LocationManager, Role.BrandOwner)
  @Post('sessions')
  open(@Body() dto: OpenSessionDto) {
    return this.sessions.openSession(dto.tableId);
  }

  // Public: diner scans a QR, gets a table-scoped session token.
  @Public()
  @Post('diner-sessions')
  resolveQr(@Body() dto: ResolveQrDto) {
    return this.sessions.resolveQr(dto.qrToken);
  }

  @Roles(Role.Waiter, Role.Cashier, Role.LocationManager, Role.BrandOwner)
  @Post('sessions/:tableId/close')
  close(@Param('tableId') tableId: string) {
    return this.sessions.closeSession(tableId);
  }
}
