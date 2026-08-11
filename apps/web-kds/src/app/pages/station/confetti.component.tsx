/**
 * Chuva de confete sobre o cartão do pedido que acabou de ficar pronto.
 *
 * Feito com `<i>` e CSS, sem biblioteca: são doze retângulos caindo por um
 * segundo e meio, e trazer um pacote de animação para isso pesaria mais no
 * carregamento da TV do que a própria tela do painel.
 *
 * As peças são geradas UMA vez, no módulo, e não a cada render: com valores
 * sorteados dentro do componente, qualquer repintura da tela reposicionaria o
 * confete no meio da queda.
 */
const CORES = ['#e0b73f', '#c8102e', '#2e7d4f', '#4a6fa5', '#e07a5f'];

const PECAS = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  left: `${(i * 8.5 + ((i * 37) % 11)) % 96}%`,
  delay: `${((i * 83) % 500) / 1000}s`,
  cor: CORES[i % CORES.length],
}));

export function Confetti() {
  return (
    <div aria-hidden className="kds-confete">
      {PECAS.map((p) => (
        <i key={p.id} style={{ left: p.left, animationDelay: p.delay, backgroundColor: p.cor }} />
      ))}
    </div>
  );
}
