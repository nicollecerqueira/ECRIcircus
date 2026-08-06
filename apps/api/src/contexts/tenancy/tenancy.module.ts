import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Brand } from './domain/brand.entity';
import { Location } from './domain/location.entity';
import { User } from './domain/user.entity';
import { TenancyController } from './tenancy.controller';
import { TenancySeedService } from './tenancy.seed';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [MikroOrmModule.forFeature([Brand, Location, User])],
  controllers: [TenancyController, UsersController],
  providers: [TenancySeedService, UsersService],
  exports: [MikroOrmModule],
})
export class TenancyModule {}
