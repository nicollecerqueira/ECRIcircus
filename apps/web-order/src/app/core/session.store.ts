import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// web-order's core has NO auth.service: o cliente é anônimo. Também não há mais
// sessão de mesa — o app abre no cardápio, sem QR — então esta store guarda só
// o carrinho e os dados que o cliente digita no fechamento. Persistida em
// sessionStorage para um refresh no meio do pedido não apagar o carrinho.
export interface CartLine {
  menuItemId: string;
  name: string;
  priceCents: number;
  qty: number;
  notes?: string;
}

/** Forma de pagamento DECLARADA pelo cliente — o caixa registra a real depois. */
export type PaymentChoice = 'pix' | 'cash' | 'card';

interface DinerSession {
  orderId: string | null;
  customerName: string;
  paymentChoice: PaymentChoice;
  cart: CartLine[];
  setOrderId: (id: string) => void;
  setCustomerName: (name: string) => void;
  setPaymentChoice: (choice: PaymentChoice) => void;
  addToCart: (line: CartLine) => void;
  removeFromCart: (menuItemId: string) => void;
  clearCart: () => void;
}

export const useSession = create<DinerSession>()(
  persist(
    (set) => ({
      orderId: null,
      customerName: '',
      paymentChoice: 'pix',
      cart: [],
      setOrderId: (orderId) => set({ orderId }),
      setCustomerName: (customerName) => set({ customerName }),
      setPaymentChoice: (paymentChoice) => set({ paymentChoice }),
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
    { name: 'ecri.diner', storage: createJSONStorage(() => sessionStorage) },
  ),
);
