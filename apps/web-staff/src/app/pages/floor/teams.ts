/**
 * Equipes do ECRI Circus.
 *
 * ÚNICA fonte da lista — para incluir, remover ou renomear uma equipe, mexa só
 * aqui. Não é enum nem tabela no banco de propósito: a composição das equipes é
 * da operação e muda sem release da API, que guarda o nome como texto.
 *
 * Ordem alfabética porque a seleção é feita procurando o nome numa lista longa.
 */
export const TEAMS = [
  'ANIMADORES',
  'ARCO-ÍRIS',
  'BANDINHA',
  'BOA AÇÃO',
  'C12 - DIRIGENTES',
  'CÂMERA E IMAGINAÇÃO',
  'COMPRAS',
  'ECRISHOP',
  'GERAL',
  'LANTERNINHA',
  'MISSA E ORAÇÃO',
  'PAPALANCHE',
  'POMBO CORREIO',
  'RANGUINHO',
  'RECEPÇÃO',
  'RECREAÇÃO',
  'TESOURINHA',
  'VASSOURINHA',
  'VISITANTES',
] as const;

export type Team = (typeof TEAMS)[number];
