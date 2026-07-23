import type { MenuItem } from './menu-item.entity';

/**
 * Regra de preço efetivo — regra de domínio pura, sem banco e sem HTTP.
 *
 * Ponto importante: quem congela o preço é o OrderItem, no instante em que o
 * item é lançado. Alterar ou encerrar uma promoção depois NÃO reescreve contas
 * já abertas — o cliente paga o que foi mostrado a ele quando pediu.
 */
export function isPromoActive(item: MenuItem, now: Date = new Date()): boolean {
  if (item.promoPriceCents === undefined || item.promoPriceCents === null) {
    return false;
  }
  if (item.promoStartsAt && now < item.promoStartsAt) {
    return false;
  }
  if (item.promoEndsAt && now > item.promoEndsAt) {
    return false;
  }
  // Promoção mais cara que o preço normal é incoerente; ignora em vez de punir
  // o cliente (o banco também barra isso por constraint).
  return item.promoPriceCents < item.priceCents;
}

/** Preço que o cliente de fato paga agora. */
export function effectivePriceCents(item: MenuItem, now: Date = new Date()): number {
  return isPromoActive(item, now) ? (item.promoPriceCents ?? item.priceCents) : item.priceCents;
}
