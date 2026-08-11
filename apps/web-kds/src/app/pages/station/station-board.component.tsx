import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { realtime } from '../../core/realtime.service';
import { Art } from '../../shared/components/art';
import { Spinner } from '../../shared/components/ui';
import { agingTone, minutesSince } from '../../shared/utils/time-ago';
import { useNow } from '../../shared/utils/use-now';
import { Confetti } from './confetti.component';
import { type KitchenOrder, pedidoPronto, type Ticket } from './station.model';
import { useAdvanceItem, useBoard } from './station.service';

/** Sem mesa, a origem do pedido é o que a cozinha tem para se orientar. */
const CHANNEL_LABEL: Record<string, string> = {
  counter: 'Balcão',
  delivery: 'Delivery',
  pos: 'Caixa',
  qr: 'QR',
  waiter: 'Garçom',
};

const AGING_CLASS: Record<ReturnType<typeof agingTone>, string> = {
  fresh: 'border-success',
  warn: 'border-warning',
  late: 'border-danger animate-pulse',
};

/** Quanto tempo o realce de "acabou de mudar" fica na tela. */
const FLASH_MS = 700;

function nextState(ticket: Ticket): 'preparing' | 'ready' {
  return ticket.state === 'queued' ? 'preparing' : 'ready';
}

/** Rótulo e cor do botão de cada item, pelo que falta fazer com ele. */
const TICKET_UI: Record<Ticket['state'], { rotulo: string; classe: string }> = {
  queued: { rotulo: 'Preparar', classe: 'bg-primary/10 text-primary' },
  preparing: { rotulo: 'Pronto', classe: 'bg-warning/20 text-warning' },
  ready: { rotulo: '✓ Pronto', classe: 'bg-success/20 text-success' },
};

function OrderCard({
  order,
  now,
  onTapItem,
}: {
  order: KitchenOrder;
  /** Agora, vindo do relógio do painel — um só para todos os cartões, senão
      cada um contaria o tempo a partir de um instante diferente. */
  now: number;
  onTapItem: (ticket: Ticket) => void;
}) {
  const mins = minutesSince(order.firedAt, now);
  const pronto = pedidoPronto(order);
  const preparando = !pronto && order.tickets.some((t) => t.state === 'preparing');

  // Itens que mudaram de estado agora há pouco — o realce dura FLASH_MS e some.
  const estadosAnteriores = useRef(new Map<string, Ticket['state']>());
  const [piscando, setPiscando] = useState<string[]>([]);
  // Confete uma vez só: sem esta trava, todo refetch do painel dispararia a
  // festa de novo enquanto o pedido continuasse pronto na tela.
  const jaComemorou = useRef(false);
  const [comemorando, setComemorando] = useState(false);

  useEffect(() => {
    const anteriores = estadosAnteriores.current;
    const mudaram = order.tickets
      .filter((t) => anteriores.has(t.itemId) && anteriores.get(t.itemId) !== t.state)
      .map((t) => t.itemId);
    for (const t of order.tickets) {
      anteriores.set(t.itemId, t.state);
    }
    if (mudaram.length === 0) {
      return;
    }
    setPiscando(mudaram);
    const id = window.setTimeout(() => setPiscando([]), FLASH_MS);
    return () => window.clearTimeout(id);
  }, [order.tickets]);

  useEffect(() => {
    if (!pronto || jaComemorou.current) {
      return;
    }
    jaComemorou.current = true;
    setComemorando(true);
    const id = window.setTimeout(() => setComemorando(false), 1600);
    return () => window.clearTimeout(id);
  }, [pronto]);

  const title =
    order.customerName?.trim() ||
    order.tableLabel ||
    CHANNEL_LABEL[order.channel] ||
    `Pedido #${order.orderId.slice(0, 8)}`;

  // Pronto = acinzentado e sem borda de atraso: não há mais o que apressar.
  // Preparando ganha cor própria, para separar à distância o que já está na
  // mão de alguém do que ainda nem começou.
  const moldura = pronto
    ? 'border-border bg-surface-2 opacity-60'
    : preparando
      ? 'border-warning bg-warning/5'
      : `bg-surface ${AGING_CLASS[agingTone(mins)]}`;

  return (
    <article
      className={`relative rounded-2xl border-4 p-4 transition-all duration-300 ${moldura} ${
        comemorando ? 'kds-celebra' : ''
      }`}
    >
      {comemorando && <Confetti />}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Pedido #{order.orderId.slice(0, 8)}
          </p>
          <h2 className="break-words text-2xl font-bold">{title}</h2>
          {/* A sala é a DESTE pedido, capturada quando ele foi feito — a pessoa
              pode ter pedido de novo de outra sala depois. */}
          <p className="mt-1 text-base font-semibold">
            {order.deliveryRoom ? (
              <>
                <span aria-hidden>🚩</span> {order.deliveryRoom}
              </>
            ) : (
              (order.tableLabel ?? CHANNEL_LABEL[order.channel] ?? order.channel)
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="text-lg text-muted">{mins}min</span>
          {pronto && (
            <span className="mt-1 block rounded-full bg-success/20 px-2 py-0.5 text-sm font-bold text-success">
              ENTREGAR
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {order.tickets.map((ticket) => (
          <button
            key={ticket.itemId}
            type="button"
            // Item pronto não avança mais: tocar de novo não teria para onde ir,
            // e o toque acidental na TV é comum.
            disabled={ticket.state === 'ready'}
            onClick={() => onTapItem(ticket)}
            className={`w-full rounded-xl border border-border bg-surface-2 p-3 text-left transition enabled:hover:border-primary disabled:opacity-70 ${
              piscando.includes(ticket.itemId) ? 'kds-flash' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className={`break-words text-xl font-bold ${
                  ticket.state === 'ready' ? 'line-through decoration-2' : ''
                }`}
              >
                {ticket.qty}× {ticket.name}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${TICKET_UI[ticket.state].classe}`}
              >
                {TICKET_UI[ticket.state].rotulo}
              </span>
            </div>
            {ticket.notes && <p className="mt-2 text-base">📝 {ticket.notes}</p>}
          </button>
        ))}
      </div>
    </article>
  );
}

export function StationBoardComponent() {
  const navigate = useNavigate();
  const { data: board, isPending } = useBoard();
  const advance = useAdvanceItem();
  const now = useNow();

  useEffect(() => {
    // `connect()` ANTES de assinar: sem ele não existe socket, e o `subscribe`
    // vira um no-op silencioso — era por isso que o painel só mostrava pedido
    // novo depois de recarregar a página. Ele é idempotente, e roda aqui (e não
    // no boot do app) porque só depois do login existe token para autenticar a
    // conexão.
    realtime().connect();
    realtime().subscribeKitchen();
    return () => realtime().unsubscribeKitchen();
  }, []);

  if (isPending || !board) {
    return <Spinner />;
  }

  const ticketCount = board.orders.reduce((sum, order) => sum + order.tickets.length, 0);

  // Ordem da tela: o que ainda exige trabalho vem primeiro, do mais NOVO para o
  // mais antigo — pedido que acabou de entrar aparece no canto superior
  // esquerdo, que é para onde o olho vai. Os prontos descem para o fim, à
  // espera de quem vai entregar.
  const emAndamento = board.orders
    .filter((o) => !pedidoPronto(o))
    .sort((a, b) => b.firedAt.localeCompare(a.firedAt));
  const prontos = board.orders
    .filter(pedidoPronto)
    .sort((a, b) => a.firedAt.localeCompare(b.firedAt));
  const ordenados = [...emAndamento, ...prontos];

  return (
    <div className="min-h-full p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          className="text-lg text-muted hover:text-fg"
          onClick={() => navigate({ to: '/' })}
        >
          Cozinha
        </button>
        <h1 className="text-right text-2xl font-bold">
          {emAndamento.length} a preparar · {ticketCount} itens
          {prontos.length > 0 && (
            <span className="ml-2 text-success">· {prontos.length} a entregar</span>
          )}
        </h1>
      </div>

      {ordenados.length === 0 ? (
        <div className="p-12 text-center">
          <Art name="seal" size="xl" fallback="🎪" className="mb-3" />
          <p className="text-2xl text-muted">Tudo pronto 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {ordenados.map((order) => (
            <OrderCard
              key={order.batchId}
              order={order}
              now={now}
              onTapItem={(ticket) =>
                advance.mutate({ itemId: ticket.itemId, state: nextState(ticket) })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
