import axios from 'axios';

/**
 * Single axios instance, sem nenhum cabeçalho de autenticação.
 *
 * O cliente é anônimo: não há login e, desde que o QR de mesa saiu, também não
 * há token de sessão para injetar. As rotas que este app usa (cardápio, criar
 * pedido, ler o próprio pedido) são públicas na API — o escopo de unidade vem
 * de `LOCATION_ID` (ver `core/config.ts`), não de um token.
 */
export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});
