import { currentTenantOrNull } from './tenant-context';

export const TENANT_FILTER = 'tenant';

/**
 * Condição do filtro global do MikroORM (isolamento, camada 2).
 *
 * FALHA FECHADO de propósito: sem contexto de tenant na requisição, a condição
 * vira `tenant = null` e a consulta não devolve NADA. O caminho "sem contexto"
 * jamais pode virar "vê tudo" — seria exatamente o vazamento cross-tenant que
 * este filtro existe para impedir (P0 em backend.md).
 *
 * Os poucos casos legítimos sem tenant (login por e-mail, seed de boot) têm de
 * desligar o filtro EXPLICITAMENTE, com `{ filters: { tenant: false } }`, para
 * que a exceção fique visível na revisão de código.
 */
export function tenantFilterCond(): { tenant: string | null } {
  return { tenant: currentTenantOrNull()?.tenantId ?? null };
}
