/**
 * Configuração de ambiente do app do cliente.
 *
 * Não há mais QR de mesa: o app abre direto no cardápio, então a unidade não
 * vem mais da leitura do código — precisa vir daqui.
 */

/**
 * Unidade cujo cardápio o app mostra e à qual os pedidos são atribuídos.
 * O padrão é a unidade de demonstração do stub; em produção, defina
 * `VITE_LOCATION_ID` no build.
 */
export const LOCATION_ID =
  import.meta.env.VITE_LOCATION_ID || '22222222-2222-2222-2222-222222222222';

/**
 * WhatsApp que recebe o relatório do pedido: DDI + DDD + número, só dígitos.
 *
 * O padrão é o número do ECRI Circus — (83) 99311-3527. Fica aqui, e não só no
 * `.env`, porque a imagem do app é construída sem passar variável de build:
 * deixado a cargo do ambiente, o número chegaria vazio na produção e o cliente
 * cairia no modo "copie o texto e envie você mesmo".
 *
 * `VITE_WHATSAPP_NUMERO` continua tendo precedência para trocar o destino sem
 * mexer no código. Vazio de propósito também funciona: a tela volta ao modo de
 * copiar, em vez de abrir um `wa.me` sem destino.
 */
const ECRI_WHATSAPP = '5583993113527';

export const WHATSAPP_NUMBER = (import.meta.env.VITE_WHATSAPP_NUMERO ?? ECRI_WHATSAPP).replace(
  /\D/g,
  '',
);
