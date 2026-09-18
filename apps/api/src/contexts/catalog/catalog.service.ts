import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { currentTenant, currentTenantOrNull } from '../../common/tenant/tenant-context';
import { Brand } from '../tenancy/domain/brand.entity';
import { Location } from '../tenancy/domain/location.entity';
import { Category } from './domain/category.entity';
import { MenuItem } from './domain/menu-item.entity';
import { effectivePriceCents, isPromoActive } from './domain/pricing';

export interface MenuItemView {
  id: string;
  name: string;
  /** Preço de tabela (o "de"). */
  priceCents: number;
  /** Preço que o cliente paga agora (o "por"). */
  effectivePriceCents: number;
  isCombo: boolean;
  comboItems?: string;
  /** `false` = ficha e afins: entra na conta, nunca vira comanda na cozinha. */
  requiresPreparation: boolean;
  promoPriceCents: number | null;
  promoStartsAt: string | null;
  promoEndsAt: string | null;
  onPromo: boolean;
  available: boolean;
  stationId: string;
  categoryId: string;
}

export function toItemView(i: MenuItem): MenuItemView {
  return {
    id: i.id,
    name: i.name,
    priceCents: i.priceCents,
    effectivePriceCents: effectivePriceCents(i),
    isCombo: i.isCombo,
    comboItems: i.comboItems ?? undefined,
    requiresPreparation: i.requiresPreparation,
    promoPriceCents: i.promoPriceCents ?? null,
    promoStartsAt: i.promoStartsAt?.toISOString() ?? null,
    promoEndsAt: i.promoEndsAt?.toISOString() ?? null,
    onPromo: isPromoActive(i),
    available: i.available,
    stationId: i.stationId,
    categoryId: i.category.id,
  };
}

export interface MenuView {
  categories: { id: string; name: string; items: MenuItemView[] }[];
}

@Injectable()
export class CatalogService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Cardápio para o staff autenticado: o escopo vem do JWT e o filtro global faz
   * o recorte sozinho.
   */
  async getMenu(): Promise<MenuView> {
    const categories = await this.em.find(
      Category,
      {},
      { populate: ['tenant'], orderBy: { sortOrder: 'asc', name: 'asc' } },
    );
    const items = await this.em.find(MenuItem, {}, { orderBy: { priceCents: 'asc', name: 'asc' } });
    return this.assemble(categories, items);
  }

  /**
   * Cardápio público (QR e storefront) — não há JWT, logo não há contexto de
   * tenant. Em vez de desligar o filtro (o que devolveria o cardápio de TODAS as
   * marcas), exigimos que o chamador diga de quem é o cardápio: a unidade ou o
   * slug da marca. O tenant é resolvido a partir daí e aplicado explicitamente.
   */
  async getPublicMenu(scope: { locationId?: string; brandSlug?: string }): Promise<MenuView> {
    const tenantId = await this.resolvePublicTenant(scope);
    const categories = await this.em.find(
      Category,
      { tenant: tenantId },
      { filters: false, orderBy: { sortOrder: 'asc', name: 'asc' } },
    );
    const items = await this.em.find(
      MenuItem,
      { tenant: tenantId },
      { filters: false, orderBy: { priceCents: 'asc', name: 'asc' } },
    );
    return this.assemble(categories, items);
  }

  private async resolvePublicTenant(scope: {
    locationId?: string;
    brandSlug?: string;
  }): Promise<string> {
    if (scope.locationId) {
      const location = await this.em.findOne(
        Location,
        { id: scope.locationId },
        { filters: false, populate: ['tenant'] },
      );
      if (!location) {
        throw new NotFoundException('Unidade não encontrada');
      }
      return location.tenant.id;
    }
    if (scope.brandSlug) {
      const brand = await this.em.findOne(Brand, { slug: scope.brandSlug.toLowerCase() });
      if (!brand) {
        throw new NotFoundException('Marca não encontrada');
      }
      return brand.id;
    }
    // Falha fechado: sem escopo declarado, não devolvemos cardápio nenhum.
    throw new BadRequestException(
      'Informe a unidade (?location=) ou a marca (?brand=) para ler o cardápio público',
    );
  }

  /** Busca escopada pelo contexto da requisição (staff autenticado). */
  async findItem(itemId: string): Promise<MenuItem | null> {
    return this.em.findOne(MenuItem, { id: itemId });
  }

  /**
   * Busca escopada ao tenant de um PEDIDO, não ao contexto da requisição.
   *
   * Existe porque lançar item é uma rota que também serve o cliente anônimo do
   * QR: ali não há JWT, logo não há contexto de tenant, e o filtro global — que
   * falha fechado — não acharia item nenhum. O pedido, porém, já nasceu com um
   * tenant; usá-lo é mais correto que confiar no estado ambiente da requisição.
   *
   * O `filters: false` é seguro aqui porque o `tenant` volta como condição
   * explícita logo abaixo — o escopo não se perde, só muda de fonte.
   */
  async findItemForTenant(tenantId: string, itemId: string): Promise<MenuItem | null> {
    return this.em.findOne(MenuItem, { id: itemId, tenant: tenantId }, { filters: false });
  }

  async createItem(input: {
    name: string;
    priceCents: number;
    categoryId: string;
    stationId: string;
    isCombo?: boolean;
    comboItems?: string;
    requiresPreparation?: boolean;
  }): Promise<MenuItemView> {
    const category = await this.em.findOne(Category, { id: input.categoryId });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }
    const item = this.em.create(MenuItem, {
      // O tenant vem do contexto da requisição, nunca do corpo: senão um cliente
      // poderia criar item no cardápio de outra marca.
      tenant: this.em.getReference(Brand, currentTenant().tenantId),
      category,
      name: input.name,
      priceCents: input.priceCents,
      isCombo: input.isCombo ?? false,
      comboItems: input.comboItems?.trim() || undefined,
      requiresPreparation: input.requiresPreparation ?? true,
      stationId: input.stationId,
      available: true,
      createdAt: new Date(),
    });
    await this.em.flush();
    return toItemView(item);
  }

  async updateItem(
    itemId: string,
    patch: {
      name?: string;
      priceCents?: number;
      available?: boolean;
      categoryId?: string;
      stationId?: string;
      isCombo?: boolean;
      comboItems?: string;
      requiresPreparation?: boolean;
      /** `null` limpa a promoção. */
      promoPriceCents?: number | null;
      promoStartsAt?: string | null;
      promoEndsAt?: string | null;
    },
  ): Promise<MenuItemView> {
    // O filtro global garante que só um item do próprio tenant seja encontrado.
    const item = await this.em.findOne(MenuItem, { id: itemId });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    // Atribuição explícita em vez de `em.assign`: o ValidationPipe entrega o DTO
    // com TODAS as chaves opcionais presentes e valendo `undefined`, e o assign
    // do MikroORM recusa undefined ("You must pass a non-undefined value").
    if (patch.name !== undefined) {
      item.name = patch.name;
    }
    if (patch.priceCents !== undefined) {
      item.priceCents = patch.priceCents;
    }
    if (patch.available !== undefined) {
      item.available = patch.available;
    }
    if (patch.categoryId !== undefined) {
      // Filtro global escopa também a busca da categoria: sem isto, um item
      // poderia ser realocado para a categoria de outro tenant só por saber o id.
      const category = await this.em.findOne(Category, { id: patch.categoryId });
      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
      item.category = category;
    }
    if (patch.stationId !== undefined) {
      item.stationId = patch.stationId;
    }
    if (patch.isCombo !== undefined) {
      item.isCombo = patch.isCombo;
    }
    if (patch.comboItems !== undefined) {
      item.comboItems = patch.comboItems.trim() || undefined;
    }
    if (patch.requiresPreparation !== undefined) {
      item.requiresPreparation = patch.requiresPreparation;
    }
    if (patch.promoPriceCents !== undefined) {
      item.promoPriceCents = patch.promoPriceCents ?? undefined;
    }
    if (patch.promoStartsAt !== undefined) {
      item.promoStartsAt = patch.promoStartsAt ? new Date(patch.promoStartsAt) : undefined;
    }
    if (patch.promoEndsAt !== undefined) {
      item.promoEndsAt = patch.promoEndsAt ? new Date(patch.promoEndsAt) : undefined;
    }

    // Promoção mais cara que o preço normal não é promoção. Barramos aqui com
    // mensagem clara, antes que a constraint do banco devolva um 500 opaco.
    if (item.promoPriceCents !== undefined && item.promoPriceCents >= item.priceCents) {
      throw new BadRequestException('O preço promocional deve ser menor que o preço normal');
    }
    if (item.promoStartsAt && item.promoEndsAt && item.promoEndsAt <= item.promoStartsAt) {
      throw new BadRequestException('O fim da promoção deve ser depois do início');
    }

    await this.em.flush();
    return toItemView(item);
  }

  async deleteItem(itemId: string): Promise<{ id: string }> {
    const item = await this.em.findOne(MenuItem, { id: itemId });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }
    await this.em.removeAndFlush(item);
    return { id: itemId };
  }

  async listCategories(): Promise<{ id: string; name: string; sortOrder: number }[]> {
    const cats = await this.em.find(Category, {}, { orderBy: { sortOrder: 'asc', name: 'asc' } });
    return cats.map((c) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder }));
  }

  async createCategory(name: string): Promise<{ id: string; name: string }> {
    // Vai para o FIM do cardápio. Com `sortOrder: 0` fixo, toda categoria nova
    // nascia na frente das que já existiam — "Fichas" apareceu antes de
    // "Lanches" na tela do cliente sem ninguém pedir isso.
    const ultima = await this.em.findOne(Category, {}, { orderBy: { sortOrder: 'desc' } });
    const category = this.em.create(Category, {
      tenant: this.em.getReference(Brand, currentTenant().tenantId),
      name,
      sortOrder: (ultima?.sortOrder ?? 0) + 1,
      createdAt: new Date(),
    });
    await this.em.flush();
    return { id: category.id, name: category.name };
  }

  /** Escopo atual, quando existir — usado por rotas que servem staff e diner. */
  hasTenantContext(): boolean {
    return currentTenantOrNull() !== undefined;
  }

  private assemble(categories: Category[], items: MenuItem[]): MenuView {
    return {
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        items: items.filter((i) => i.category.id === c.id).map(toItemView),
      })),
    };
  }
}
