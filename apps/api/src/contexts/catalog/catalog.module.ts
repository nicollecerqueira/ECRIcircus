import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TenancyModule } from '../tenancy/tenancy.module';
import { CatalogController } from './catalog.controller';
import { CatalogSeedService } from './catalog.seed';
import { CatalogService } from './catalog.service';
import { Category } from './domain/category.entity';
import { MenuItem } from './domain/menu-item.entity';

@Module({
  // Depende de Tenancy (marca é dona do catálogo) — a importação também garante
  // que o seed de marcas rode antes do seed de cardápio.
  imports: [TenancyModule, MikroOrmModule.forFeature([Category, MenuItem])],
  controllers: [CatalogController],
  providers: [CatalogService, CatalogSeedService],
  exports: [CatalogService],
})
export class CatalogModule {}
