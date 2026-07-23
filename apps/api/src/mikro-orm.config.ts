import { UnderscoreNamingStrategy } from '@mikro-orm/core';
import { defineConfig } from '@mikro-orm/postgresql';
import { Category } from './contexts/catalog/domain/category.entity';
import { MenuItem } from './contexts/catalog/domain/menu-item.entity';
import { Brand } from './contexts/tenancy/domain/brand.entity';
import { Location } from './contexts/tenancy/domain/location.entity';
import { User } from './contexts/tenancy/domain/user.entity';

/**
 * Fase 1 — Tenancy. Isolamento em duas camadas por enquanto:
 *   1. contexto de requisição (AsyncLocalStorage) resolvendo o tenantId
 *   2. filtro global do MikroORM em `tenant_id`, ligado por padrão
 * A terceira camada (RLS no Postgres) entra depois, como reforço.
 */
export default defineConfig({
  clientUrl: process.env.DATABASE_URL ?? 'postgres://prato:prato@localhost:55432/prato',
  entities: [Brand, Location, User, Category, MenuItem],
  // snake_case em tabelas e colunas (padrão Avenir)
  namingStrategy: UnderscoreNamingStrategy,
  migrations: {
    path: 'dist/migrations',
    pathTs: 'src/migrations',
    // Migrations idempotentes; uma falha não desfaz as anteriores (padrão Nexus).
    allOrNothing: false,
    disableForeignKeys: false,
    emit: 'ts',
  },
  debug: process.env.NODE_ENV === 'development',
});
