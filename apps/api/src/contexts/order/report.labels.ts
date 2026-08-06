/**
 * Rótulos em português do relatório.
 *
 * Ficam na API, e não reaproveitados do front, porque a planilha é lida FORA do
 * app — por quem presta contas do evento, muitas vezes sem nunca ter aberto a
 * tela. "in_kitchen" ou "pix" cru não significam nada nesse contexto.
 */
export const ORDER_STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho',
  open: 'Aberta',
  in_kitchen: 'Na cozinha',
  ready: 'Pronta',
  served: 'Servida',
  awaiting_payment: 'Aguardando pagamento',
  partially_paid: 'Paga em parte',
  paid: 'Paga',
  closed: 'Fechada',
  cancelled: 'Cancelada',
};

/** Pagamento REGISTRADO pelo caixa — dinheiro que entrou. */
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
};

/** Intenção DECLARADA pelo cliente no app — ainda não é pagamento. */
export const PAYMENT_INTENT_LABEL: Record<string, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
  account: 'Na conta',
};
