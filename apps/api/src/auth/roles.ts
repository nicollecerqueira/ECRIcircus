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

export const ALL_ROLES: Role[] = Object.values(Role);
