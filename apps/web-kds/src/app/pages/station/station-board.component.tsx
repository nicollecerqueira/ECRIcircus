import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { realtime } from '../../core/realtime.service';
import { Art } from '../../shared/components/art';
import { Spinner } from '../../shared/components/ui';
import { agingTone, minutesSince } from '../../shared/utils/time-ago';
import { useNow } from '../../shared/utils/use-now';
import type { KitchenOrder, Ticket } from './station.model';
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

function nextState(ticket: Ticket): 'preparing' | 'ready' {
  return ticket.state === 'queued' ? 'preparing' : 'ready';
}

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
  const title =
    order.customerName?.trim() ||
    order.tableLabel ||
    CHANNEL_LABEL[order.channel] ||
    `Pedido #${order.orderId.slice(0, 8)}`;

  return (
    <article className={`rounded-2xl border-4 bg-surface p-4 ${AGING_CLASS[agingTone(mins)]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Pedido #{order.orderId.slice(0, 8)}
          </p>
          <h2 className="break-words text-2xl font-bold">{title}</h2>
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
        <span className="shrink-0 text-lg text-muted">{mins}min</span>
      </div>

      <div className="mt-4 space-y-2">
        {order.tickets.map((ticket) => (
          <button
            key={ticket.itemId}
            type="button"
            onClick={() => onTapItem(ticket)}
            className="w-full rounded-xl border border-border bg-surface-2 p-3 text-left transition hover:border-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="break-words text-xl font-bold">
                {ticket.qty}× {ticket.name}
              </span>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {ticket.state === 'queued' ? 'Preparar' : 'Pronto'}
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
    realtime().subscribeKitchen();
    return () => realtime().unsubscribeKitchen();
  }, []);

  if (isPending || !board) {
    return <Spinner />;
  }

  const ticketCount = board.orders.reduce((sum, order) => sum + order.tickets.length, 0);

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
          {board.orders.length} pedidos · {ticketCount} itens
        </h1>
      </div>

      {board.orders.length === 0 ? (
        <div className="p-12 text-center">
          <Art name="seal" size="xl" fallback="🎪" className="mb-3" />
          <p className="text-2xl text-muted">Tudo pronto 🎉</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {board.orders.map((order) => (
            <OrderCard
              key={order.orderId}
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
