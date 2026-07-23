import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// web-order's core has NO auth.service — instead a session.store holds the diner's
// table token (from scanning the QR). Persisted to sessionStorage so a refresh on
// /menu keeps the table session; cleared when the tab closes.
export interface CartLine {
  menuItemId: string;
  name: string;
  priceCents: number;
  qty: number;
  notes?: string;
}

interface DinerSession {
  dinerToken: string | null;
  sessionId: string | null;
  tableId: string | null;
  locationId: string | null;
  orderId: string | null;
  cart: CartLine[];
  setSession: (p: {
    dinerToken: string;
    sessionId: string;
    tableId: string;
    locationId: string;
  }) => void;
  setOrderId: (id: string) => void;
  addToCart: (line: CartLine) => void;
  removeFromCart: (menuItemId: string) => void;
  clearCart: () => void;
}

export const useSession = create<DinerSession>()(
  persist(
    (set) => ({
      dinerToken: null,
      sessionId: null,
      tableId: null,
      locationId: null,
      orderId: null,
      cart: [],
      setSession: (p) => set({ ...p }),
      setOrderId: (orderId) => set({ orderId }),
      addToCart: (line) =>
        set((s) => {
          const existing = s.cart.find((c) => c.menuItemId === line.menuItemId);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.menuItemId === line.menuItemId ? { ...c, qty: c.qty + line.qty } : c,
              ),
            };
          }
          return { cart: [...s.cart, line] };
        }),
      removeFromCart: (menuItemId) =>
        set((s) => ({ cart: s.cart.filter((c) => c.menuItemId !== menuItemId) })),
      clearCart: () => set({ cart: [] }),
    }),
    { name: 'prato.diner', storage: createJSONStorage(() => sessionStorage) },
  ),
);
