/** Roles from business-rules.md RBAC matrix. QR diners are NOT users. */
export const Role = {
  PlatformAdmin: 'platform_admin',
  BrandOwner: 'brand_owner',
  LocationManager: 'location_manager',
  Waiter: 'waiter',
  Cashier: 'cashier',
  Kitchen: 'kitchen',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Todos os papéis de STAFF. Não inclui o diner de propósito: `@Roles(...ALL_ROLES)`
 *  significa "qualquer funcionário, nunca o cliente do QR". */
export const ALL_ROLES: Role[] = Object.values(Role);

/**
 * Cliente do QR. NÃO é um User (não tem linha na tabela), mas carrega um token
 * de sessão assinado com este papel, para o realtime e o RBAC o distinguirem.
 */
export const DINER_ROLE = 'diner';
export type DinerRole = typeof DINER_ROLE;
