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
