import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { UsersService } from './users.service';

/**
 * Contas de staff — superfície EXCLUSIVA do dono.
 *
 * `@Roles` na classe vale para todas as rotas: nenhuma delas pode ser aberta a
 * mais gente por descuido de esquecer o decorator num método novo. Gerente não
 * entra de propósito — quem cria acesso decide quem entra no caixa, e isso é
 * decisão de dono.
 */
@Roles(Role.BrandOwner)
@Controller('admin/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
