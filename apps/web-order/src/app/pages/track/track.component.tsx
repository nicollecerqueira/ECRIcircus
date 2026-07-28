import { Link, useParams } from '@tanstack/react-router';
import { useEffect } from 'react';
import { realtime } from '../../core/realtime.service';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { STATE_LABEL } from '../order/order.model';
import { useDinerOrder } from '../order/order.service';

/** ready = verde (ação concluída); preparing = dourado (em curso); resto neutro. */
const STATE_TONE: Record<string, string> = {
  queued: 'neutral',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
};

/** Live order tracking (`/track/$orderId`). Updates via the diner's order room. */
export function OrderTrackComponent() {
  const { orderId } = useParams({ from: '/track/$orderId' });
  const { data: order, isPending } = useDinerOrder(orderId);

  useEffect(() => {
    realtime().followOrder(orderId);
  }, [orderId]);

  if (isPending || !order) {
    return <Spinner />;
  }

  const active = order.items.filter((i) => i.state !== 'voided');
  const allReady =
    active.length > 0 && active.every((i) => i.state === 'ready' || i.state === 'served');

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-1 text-2xl font-bold">Seu pedido</h1>
      <p className="mb-4 text-muted">
        {allReady ? 'Tudo pronto! 🎉' : 'Acompanhe o preparo em tempo real.'}
      </p>
      <Card className="divide-y divide-border p-0">
        {active.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-3">
            <span>
              {item.qty}× {item.name}
            </span>
            <Badge tone={STATE_TONE[item.state] ?? 'neutral'}>
              {STATE_LABEL[item.state] ?? item.state}
            </Badge>
          </div>
        ))}
      </Card>
      <Link to="/menu" className="mt-4 block">
        <Button variant="ghost" className="w-full">
          Pedir mais
        </Button>
      </Link>
    </div>
  );
}
