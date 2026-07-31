import { WHATSAPP_NUMBER } from '../../core/config';
import type { PaymentChoice } from '../../core/session.store';
import { formatCents } from './money';

export const PAYMENT_LABEL: Record<PaymentChoice, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
};

/** Linha do relatório. Serve tanto para o carrinho local quanto para os itens
    que voltam da API — por isso o formato mínimo em comum. */
export interface ReportLine {
  name: string;
  qty: number;
  priceCents: number;
}

interface Report {
  orderId: string;
  customerName: string;
  paymentChoice: PaymentChoice;
  lines: ReportLine[];
}

/**
 * Relatório do pedido em texto, para o WhatsApp da casa.
 *
 * Texto puro de propósito: o corpo vai na query string de um link `wa.me`, e
 * qualquer marcação sofisticada só atrapalharia a leitura no celular de quem
 * atende. Os 8 primeiros caracteres do id bastam para casar com o pedido no
 * caixa sem poluir a mensagem.
 */
export function buildOrderReport({ orderId, customerName, paymentChoice, lines }: Report): string {
  const total = lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
  const items = lines.map((l) => `• ${l.qty}x ${l.name} — ${formatCents(l.priceCents * l.qty)}`);

  return [
    '🎪 *ECRI Circus — novo pedido*',
    '',
    `Pedido: #${orderId.slice(0, 8)}`,
    `Cliente: ${customerName.trim() || 'não informado'}`,
    '',
    'Itens:',
    ...items,
    '',
    `Total: ${formatCents(total)}`,
    `Pagamento: ${PAYMENT_LABEL[paymentChoice]}`,
  ].join('\n');
}

/**
 * Link `wa.me` com o relatório já preenchido, ou `null` enquanto o número da
 * casa não estiver configurado (`VITE_WHATSAPP_NUMERO`). Devolver `null` em vez
 * de um link para `wa.me/` sem destino é o que permite a tela cair no modo
 * "copiar o texto" sem fingir que enviou.
 */
export function whatsappLink(report: string): string | null {
  if (!WHATSAPP_NUMBER) {
    return null;
  }
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(report)}`;
}
