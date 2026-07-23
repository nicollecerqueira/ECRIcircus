import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { Table } from './domain/table.entity';
import { TableSession } from './domain/table-session.entity';
import { SessionController } from './session.controller';
import { SessionSeedService } from './session.seed';
import { SessionService } from './session.service';

@Module({
  // Depende de Tenancy (marca/unidade são donas das mesas) — a importação também
  // garante que o seed de marcas rode antes do seed de mesas.
  imports: [TenancyModule, MikroOrmModule.forFeature([Table, TableSession])],
  controllers: [SessionController],
  providers: [SessionService, SessionSeedService],
  exports: [SessionService],
})
export class SessionModule {}
