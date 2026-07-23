import { Role } from '../auth/roles';

/**
 * Demo seed for the skeleton (USE_STUB_DATA=true). One brand (tenant), one
 * location, one user per role, stations, and a small menu — enough for the three
 * frontends to develop against. Replaced by DB seeds in the backend phase.
 */

export const DEMO_TENANT_ID = '11111111-1111-1111-1111-111111111111';
export const DEMO_LOCATION_ID = '22222222-2222-2222-2222-222222222222';

export const STATIONS = [
  { id: 'st-grill', name: 'Grelha', kind: 'grill' },
  { id: 'st-bar', name: 'Bar', kind: 'bar' },
  { id: 'st-dessert', name: 'Sobremesas', kind: 'dessert' },
];

export interface SeedUser {
  id: string;
  email: string;
  /** demo-only plaintext; hashed at boot by AuthService */
  password: string;
  name: string;
  role: Role;
  stationIds?: string[];
}

// All demo users share the password below. Clearly non-production.
export const DEMO_PASSWORD = 'prato123';

export const USERS: SeedUser[] = [
  {
    id: 'u-owner',
    email: 'owner@demo.prato.app',
    password: DEMO_PASSWORD,
    name: 'Ana (Dona)',
    role: Role.BrandOwner,
  },
  {
    id: 'u-manager',
    email: 'manager@demo.prato.app',
    password: DEMO_PASSWORD,
    name: 'Bruno (Gerente)',
    role: Role.LocationManager,
  },
  {
    id: 'u-waiter',
    email: 'waiter@demo.prato.app',
    password: DEMO_PASSWORD,
    name: 'Carla (Garçom)',
    role: Role.Waiter,
  },
  {
    id: 'u-cashier',
    email: 'cashier@demo.prato.app',
    password: DEMO_PASSWORD,
    name: 'Diego (Caixa)',
    role: Role.Cashier,
  },
  {
    id: 'u-kitchen',
    email: 'kitchen@demo.prato.app',
    password: DEMO_PASSWORD,
    name: 'Cozinha',
    role: Role.Kitchen,
    stationIds: ['st-grill', 'st-bar', 'st-dessert'],
  },
];

export interface SeedMenuItem {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  stationId: string;
  available: boolean;
}

export const CATEGORIES = [
  { id: 'cat-mains', name: 'Pratos principais' },
  { id: 'cat-drinks', name: 'Bebidas' },
  { id: 'cat-desserts', name: 'Sobremesas' },
];

export const MENU_ITEMS: SeedMenuItem[] = [
  {
    id: 'mi-burger',
    categoryId: 'cat-mains',
    name: 'Hambúrguer artesanal',
    priceCents: 3200,
    stationId: 'st-grill',
    available: true,
  },
  {
    id: 'mi-steak',
    categoryId: 'cat-mains',
    name: 'Picanha na chapa',
    priceCents: 5800,
    stationId: 'st-grill',
    available: true,
  },
  {
    id: 'mi-fries',
    categoryId: 'cat-mains',
    name: 'Batata frita',
    priceCents: 1800,
    stationId: 'st-grill',
    available: true,
  },
  {
    id: 'mi-soda',
    categoryId: 'cat-drinks',
    name: 'Refrigerante',
    priceCents: 900,
    stationId: 'st-bar',
    available: true,
  },
  {
    id: 'mi-beer',
    categoryId: 'cat-drinks',
    name: 'Chopp',
    priceCents: 1400,
    stationId: 'st-bar',
    available: true,
  },
  {
    id: 'mi-juice',
    categoryId: 'cat-drinks',
    name: 'Suco natural',
    priceCents: 1200,
    stationId: 'st-bar',
    available: false,
  },
  {
    id: 'mi-pudding',
    categoryId: 'cat-desserts',
    name: 'Pudim',
    priceCents: 1600,
    stationId: 'st-dessert',
    available: true,
  },
];

export const TABLES = Array.from({ length: 12 }, (_, i) => ({
  id: `tb-${i + 1}`,
  number: i + 1,
  seats: i % 2 === 0 ? 4 : 2,
}));
