import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { realtime } from '../../core/realtime.service';
import { Art } from '../../shared/components/art';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useTables } from '../floor/floor.service';
import { ITEM_STATE_LABEL, ITEM_STATE_TONE, orderTotalCents } from './order.model';
import { useAddItem, useMenu, useOrder, useVoidItem } from './order.service';

export function OrderComponent() {
  const { id } = useParams({ from: '/shell/order/$id' });
  const navigate = useNavigate();
  const { data: order, isPending } = useOrder(id);
  const { data: menu } = useMenu();
  const { data: tables } = useTables();
  const addItem = useAddItem(id);
  const voidItem = useVoidItem(id);

  // Follow this order's real-time room while the screen is open.
  useEffect(() => {
    realtime().subscribe('order', id);
    return () => realtime().unsubscribe('order', id);
  }, [id]);

  if (isPending || !order) {
    return <Spinner />;
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Pedido
            {order.tableId
              ? ` · Mesa ${tables?.find((t) => t.id === order.tableId)?.number ?? ''}`
              : ''}
          </h1>
          <Badge tone="primary">{order.status}</Badge>
        </div>

        <Card>
          {order.items.length === 0 ? (
            <div className="py-6 text-center">
              <Art name="rabbitHat" size="md" fallback="🎩" className="mb-2" />
              <p className="text-muted">Nenhum item ainda. Adicione do cardápio →</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className={item.state === 'voided' ? 'line-through text-muted' : ''}>
                      {item.qty}× {item.name}
                    </span>
                    {item.notes && <p className="text-xs text-muted">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={ITEM_STATE_TONE[item.state]}>{ITEM_STATE_LABEL[item.state]}</Badge>
                    {item.state !== 'voided' && (
                      <button
                        type="button"
                        className="text-xs text-danger hover:underline"
                        onClick={() => {
                          const reason = window.prompt('Motivo do cancelamento?');
                          if (reason) {
                            voidItem.mutate({ itemId: item.id, reason });
                          }
                        }}
                      >
                        cancelar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatCents(orderTotalCents(order))}</span>
          </div>
        </Card>

        <div className="mt-4 flex gap-2">
          <Button
            onClick={() => navigate({ to: '/pos/checkout/$orderId', params: { orderId: id } })}
          >
            Fechar conta
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: '/floor' })}>
            Voltar ao salão
          </Button>
        </div>
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted">Cardápio</h2>
        <div className="space-y-4">
          {menu?.categories.map((cat) => (
            <Card key={cat.id}>
              <h3 className="mb-2 font-semibold">{cat.name}</h3>
              <ul className="space-y-1">
                {cat.items.map((mi) => (
                  <li key={mi.id} className="flex items-center justify-between">
                    <span className={mi.available ? '' : 'text-muted line-through'}>
                      {mi.name} ·{' '}
                      {mi.onPromo ? (
                        <>
                          <span className="text-muted line-through">
                            {formatCents(mi.priceCents)}
                          </span>{' '}
                          <span className="font-semibold text-danger">
                            {formatCents(mi.effectivePriceCents)}
                          </span>
                        </>
                      ) : (
                        formatCents(mi.priceCents)
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      disabled={!mi.available || addItem.isPending}
                      onClick={() => addItem.mutate({ menuItemId: mi.id, qty: 1 })}
                    >
                      +
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </aside>
    </div>
  );
}
