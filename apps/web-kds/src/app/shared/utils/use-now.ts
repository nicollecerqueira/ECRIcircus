import { useEffect, useState } from 'react';

/**
 * Relógio que pulsa: devolve `Date.now()` a cada `intervalMs`.
 *
 * Existe porque o tempo do pedido é calculado no RENDER, e o painel não tinha
 * o que o fizesse renderizar de novo. O refetch de 30s não serve: quando nada
 * mudou na cozinha, a resposta é idêntica, o React Query preserva a referência
 * dos dados e o componente não repinta. Resultado: "3min" ficava 3min para
 * sempre, e a borda de atraso (verde → amarelo → vermelho) nunca avançava —
 * justamente o que a cozinha usa para saber o que priorizar.
 *
 * 30s de intervalo para um rótulo em minutos: o número erra por no máximo meio
 * minuto, e o painel não fica repintando à toa numa TV que passa o dia ligada.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
