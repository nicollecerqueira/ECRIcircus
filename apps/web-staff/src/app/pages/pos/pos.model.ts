import {
  accountLabel,
  isActiveOrder,
  isOnAccount,
  type Order,
  orderTotalCents,
  teamLabel,
} from '../order/order.model';

/**
 * A unidade de cobrança do caixa é a CONTA, não o pedido.
 *
 * Uma mesa pode ter mais de um pedido sob a mesma sessão (garçom lançou um, o
 * cliente pediu mais pelo QR, etc.). O caixa tem de ver o valor da mesa somado —
 * mostrar valores separados faz o operador cobrar só uma parte da conta.
 *
 * Pedidos sem mesa (balcão e delivery) são contas individuais por natureza.
 */
export interface Bill {
  key: string;
  label: string;
  /** Equipe da pessoa — desempata homônimos na hora de cobrar. Sempre preenchido
      (cai no rótulo de "não informada"), para a linha não sumir do cartão. */
  teamName: string;
  /** Conta deixada para acertar depois: o cliente escolheu "colocar na conta". */
  onAccount: boolean;
  /** Pedidos que compõem esta conta, do mais antigo para o mais novo. */
  orders: Order[];
  totalCents: number;
  paidCents: number;
  /** Pedido para onde o fechamento navega. */
  primaryOrderId: string;
}

function tableLabel(tableId: string, numberById?: Map<string, number>): string {
  // O id da mesa é UUID; o número humano vem do mapa carregado de /tables.
  const number = numberById?.get(tableId);
  return number ? `Mesa ${number}` : 'Mesa';
}

export function buildBills(orders: Order[], tableNumberById?: Map<string, number>): Bill[] {
  const active = orders.filter(isActiveOrder);
  const byKey = new Map<string, Order[]>();

  for (const order of active) {
    // Mesa agrupa; balcão/delivery ficam sozinhos na própria conta.
    const key = order.tableId ? `table:${order.tableId}` : `order:${order.id}`;
    const group = byKey.get(key);
    if (group) {
      group.push(order);
    } else {
      byKey.set(key, [order]);
    }
  }

  return [...byKey.entries()]
    .map(([key, group]) => {
      const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const first = sorted[0];
      return {
        key,
        label: first.tableId ? tableLabel(first.tableId, tableNumberById) : accountLabel(first),
        teamName: teamLabel(first),
        onAccount: sorted.some((o) => isOnAccount(o)),
        orders: sorted,
        totalCents: sorted.reduce((sum, o) => sum + orderTotalCents(o), 0),
        paidCents: sorted.reduce(
          (sum, o) => sum + o.payments.reduce((s, p) => s + p.amountCents, 0),
          0,
        ),
        primaryOrderId: first.id,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }));
}

export function billsGrandTotalCents(bills: Bill[]): number {
  return bills.reduce((sum, b) => sum + b.totalCents - b.paidCents, 0);
}
