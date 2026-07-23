import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { realtime } from '../../core/realtime.service';
import { Spinner } from '../../shared/components/ui';
import { agingTone, minutesSince } from '../../shared/utils/time-ago';
import type { Ticket } from './station.model';
import { useAdvanceItem, useBoard } from './station.service';

const AGING_CLASS: Record<ReturnType<typeof agingTone>, string> = {
  fresh: 'border-success',
  warn: 'border-warning',
  late: 'border-danger animate-pulse',
};

function TicketCard({ ticket, onTap }: { ticket: Ticket; onTap: () => void }) {
  const mins = minutesSince(ticket.firedAt);
  return (
    <button
      type="button"
      onClick={onTap}
      className={`min-h-40 rounded-2xl border-4 bg-surface p-4 text-left ${AGING_CLASS[agingTone(mins)]}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl font-bold">
          {ticket.qty}× {ticket.name}
        </span>
        <span className="text-lg text-muted">{mins}min</span>
      </div>
      <p className="mt-1 text-sm text-muted">{ticket.tableLabel ?? ticket.channel}</p>
      {ticket.notes && <p className="mt-2 text-base">📝 {ticket.notes}</p>}
      <p className="mt-3 text-lg font-semibold text-primary">
        {ticket.state === 'queued' ? 'Toque = Preparar' : 'Toque = Pronto ✓'}
      </p>
    </button>
  );
}

export function StationBoardComponent() {
  const { id } = useParams({ from: '/shell/station/$id' });
  const navigate = useNavigate();
  const { data: board, isPending } = useBoard(id);
  const advance = useAdvanceItem(id);

  useEffect(() => {
    realtime().subscribeStation(id);
    return () => realtime().unsubscribeStation(id);
  }, [id]);

  if (isPending || !board) {
    return <Spinner />;
  }

  const onTap = (t: Ticket) => {
    // One tap = preparing, next tap = ready (bump-bar flow).
    advance.mutate({ itemId: t.itemId, state: t.state === 'queued' ? 'preparing' : 'ready' });
  };

  return (
    <div className="min-h-full p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="text-lg text-muted hover:text-fg"
          onClick={() => navigate({ to: '/' })}
        >
          ← Estações
        </button>
        <h1 className="text-2xl font-bold">{board.tickets.length} itens na fila</h1>
      </div>
      {board.tickets.length === 0 ? (
        <p className="p-12 text-center text-2xl text-muted">Tudo pronto 🎉</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {board.tickets.map((t) => (
            <TicketCard key={t.itemId} ticket={t} onTap={() => onTap(t)} />
          ))}
        </div>
      )}
    </div>
  );
}
