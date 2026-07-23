import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../auth/optional-jwt-auth.guard';
import { Role } from '../../auth/roles';
import { Roles } from '../../auth/roles.decorator';
import { CatalogService } from './catalog.service';
import { CreateCategoryDto, CreateMenuItemDto, UpdateMenuItemDto } from './dto';

const MANAGERS = [Role.LocationManager, Role.BrandOwner] as const;

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  /**
   * Leitura do cardápio. Serve dois públicos:
   *  - staff autenticado → escopo do JWT, filtro global recorta sozinho
   *  - diner anônimo (QR/storefront) → precisa declarar `?location=` ou `?brand=`
   * Sem token e sem escopo declarado, responde 400 em vez de vazar tudo.
   */
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get('menu')
  menu(@Query('location') location?: string, @Query('brand') brand?: string) {
    if (this.catalog.hasTenantContext()) {
      return this.catalog.getMenu();
    }
    return this.catalog.getPublicMenu({ locationId: location, brandSlug: brand });
  }

  @Roles(...MANAGERS)
  @Get('admin/categories')
  categories() {
    return this.catalog.listCategories();
  }

  @Roles(...MANAGERS)
  @Post('admin/categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.catalog.createCategory(dto.name);
  }

  @Roles(...MANAGERS)
  @Post('admin/menu')
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.catalog.createItem(dto);
  }

  @Roles(...MANAGERS)
  @Patch('admin/menu/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateMenuItemDto) {
    return this.catalog.updateItem(itemId, dto);
  }

  @Roles(...MANAGERS)
  @Delete('admin/menu/:itemId')
  deleteItem(@Param('itemId') itemId: string) {
    return this.catalog.deleteItem(itemId);
  }
}
