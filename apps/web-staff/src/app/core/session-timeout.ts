import { sessionExpirada, useAuthStore } from './auth.store';

/**
 * O que conta como "a pessoa está aí". Só entrada humana — nada de evento que o
 * próprio app dispara sozinho: se atualização automática de tela contasse como
 * atividade, a sessão nunca expiraria e o corte por inatividade viraria enfeite.
 */
const SINAIS_DE_VIDA = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const;

/** De quanto em quanto tempo o relógio confere se estourou o limite. */
const INTERVALO_DE_CHECAGEM_MS = 30_000;

/**
 * Vigia a inatividade e chama `aoExpirar` quando o tempo estoura.
 *
 * A checagem é por relógio, não por temporizador armado no último toque: com
 * `setTimeout` reagendado a cada evento, o aparelho que dorme (tablet na tela
 * de bloqueio) acordaria com o temporizador atrasado e a sessão sobreviveria
 * mais do que devia. Comparar o instante atual com o último sinal de vida vale
 * mesmo depois de o aparelho ficar horas suspenso.
 */
export function vigiarInatividade(aoExpirar: () => void): void {
  const marcar = () => useAuthStore.getState().touch();
  for (const evento of SINAIS_DE_VIDA) {
    window.addEventListener(evento, marcar, { passive: true });
  }

  // Voltar para a aba é o momento em que a pessoa DE FATO reencontra a tela:
  // se a sessão morreu enquanto estava em segundo plano, ela precisa descobrir
  // agora, e não só no próximo tique do relógio.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && sessionExpirada()) {
      aoExpirar();
    }
  });

  window.setInterval(() => {
    if (sessionExpirada()) {
      aoExpirar();
    }
  }, INTERVALO_DE_CHECAGEM_MS);
}

/**
 * Encerra a sessão e leva ao login.
 *
 * Navegação DURA, como no interceptor: recarregar garante que não sobrou estado
 * de uma sessão morta em cache de tela nenhuma.
 */
export function encerrarPorInatividade(): void {
  useAuthStore.getState().clear();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login?expirado=1');
  }
}
