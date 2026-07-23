import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { orderTotalCents } from '../order/order.model';
import { useOrder } from '../order/order.service';
import {
  useCloseOrder,
  useRegisterPayment,
  useRequestPayment,
  useSplitEvenly,
} from './pos.service';

const METHODS = ['cash', 'card', 'pix', 'voucher', 'other'] as const;
const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
  voucher: 'Vale',
  other: 'Outro',
};

export function CheckoutComponent() {
  const { orderId } = useParams({ from: '/shell/pos/checkout/$orderId' });
  const navigate = useNavigate();
  const { data: order, isPending } = useOrder(orderId);
  const requestPayment = useRequestPayment(orderId);
  const registerPayment = useRegisterPayment(orderId);
  const closeOrder = useCloseOrder(orderId);

  const [parts, setParts] = useState(1);
  const split = useSplitEvenly(orderId, parts);
  const [method, setMethod] = useState<string>('card');

  if (isPending || !order) {
    return <Spinner />;
  }

  const total = orderTotalCents(order);
  const paid = order.payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = total - paid;
  const awaiting = order.status === 'awaiting_payment' || order.status === 'partially_paid';

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Fechamento</h1>
        <Badge tone="primary">{order.status}</Badge>
      </div>

      <Card>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Total</span>
          <span className="font-semibold">{formatCents(total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">Pago</span>
          <span className="font-semibold">{formatCents(paid)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border pt-1">
          <span>Restante</span>
          <span className="font-bold">{formatCents(remaining)}</span>
        </div>
      </Card>

      {!awaiting && order.status !== 'paid' && order.status !== 'closed' && (
        <Button className="mt-4 w-full" onClick={() => requestPayment.mutate()}>
          Solicitar pagamento
        </Button>
      )}

      {awaiting && (
        <Card className="mt-4 space-y-3">
          <div>
            <span className="mb-1 block text-sm font-medium">Dividir por</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Button
                  key={n}
                  variant={parts === n ? 'primary' : 'ghost'}
                  className="px-3 py-1"
                  onClick={() => setParts(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            {split.data && parts > 1 && (
              <p className="mt-2 text-sm text-muted">
                {split.data.shares.map((s) => formatCents(s)).join(' · ')}
              </p>
            )}
          </div>

          <div>
            <span className="mb-1 block text-sm font-medium">Forma de pagamento</span>
            <div className="flex flex-wrap gap-2">
              {METHODS.map((m) => (
                <Button
                  key={m}
                  variant={method === m ? 'primary' : 'ghost'}
                  className="px-3 py-1 text-sm"
                  onClick={() => setMethod(m)}
                >
                  {METHOD_LABEL[m]}
                </Button>
              ))}
            </div>
          </div>

          <Button
            variant="success"
            className="w-full"
            disabled={remaining <= 0 || registerPayment.isPending}
            onClick={() =>
              registerPayment.mutate({
                method,
                amountCents: parts > 1 ? (split.data?.shares[0] ?? remaining) : remaining,
              })
            }
          >
            Registrar {parts > 1 ? '1 parte' : 'pagamento'} ·{' '}
            {formatCents(parts > 1 ? (split.data?.shares[0] ?? remaining) : remaining)}
          </Button>
        </Card>
      )}

      {order.status === 'paid' && (
        <Button
          className="mt-4 w-full"
          onClick={() =>
            closeOrder.mutate(undefined, { onSuccess: () => navigate({ to: '/pos' }) })
          }
        >
          Fechar e liberar mesa
        </Button>
      )}
    </div>
  );
}
