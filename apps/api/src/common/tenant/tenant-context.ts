import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  tenantId: string;
  locationId?: string;
  userId?: string;
  role?: string;
  stationIds?: string[];
}

/**
 * Request-scoped tenant context (isolation layer 1, see docs/tenancy.md).
 * The TenantInterceptor populates this from the JWT / QR session token; the ORM
 * global filter and the Postgres RLS GUC both read `tenantId` from here.
 */
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function currentTenant(): TenantContext {
  const ctx = tenantStorage.getStore();
  if (!ctx) {
    throw new Error('No tenant context — request ran outside the tenant interceptor.');
  }
  return ctx;
}

export function currentTenantOrNull(): TenantContext | undefined {
  return tenantStorage.getStore();
}
