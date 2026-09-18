import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents, parseMoneyToCents } from '../../shared/utils/money';
import {
  accountLabel,
  isOnAccount,
  ORDER_STATUS_LABEL,
  orderTotalCents,
  PAYMENT_INTENT_LABEL,
  teamLabel,
} from '../order/order.model';
import { useOrder } from '../order/order.service';
import {
  useCloseOrder,
  useRegisterPayment,
  useRequestPayment,
  useSplitEvenly,
} from './pos.service';

const METHODS = ['pix', 'cash', 'card'] as const;
type PaymentMethod = (typeof METHODS)[number];
const METHOD_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  card: 'Cartão',
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
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [cashNeedsChange, setCashNeedsChange] = useState(false);
  const [cashChangeFor, setCashChangeFor] = useState('');

  if (isPending || !order) {
    return <Spinner />;
  }

  const total = orderTotalCents(order);
  const paid = order.payments.reduce((s, p) => s + p.amountCents, 0);
  const remaining = total - paid;
  const paymentAmount = parts > 1 ? (split.data?.shares[0] ?? remaining) : remaining;
  const cashChangeForCents = parseMoneyToCents(cashChangeFor);
  const cashChangeIsValid =
    method !== 'cash' ||
    !cashNeedsChange ||
    (cashChangeForCents !== null && cashChangeForCents >= paymentAmount);
  const paymentNote =
    method !== 'cash'
      ? undefined
      : cashNeedsChange
        ? `Troco para ${formatCents(cashChangeForCents ?? 0)}`
        : 'Sem troco';
  const awaiting = order.status === 'awaiting_payment' || order.status === 'partially_paid';

  // Cancelados aparecem riscados, não somem: o cliente pode perguntar por um
  // item que pediu e foi anulado, e o caixa precisa saber responder.
  const billed = order.items.filter((i) => i.state !== 'voided');
  const voided = order.items.filter((i) => i.state === 'voided');

  return (
    <div className="mx-auto max-w-xl p-4 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{accountLabel(order)}</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent">
            {teamLabel(order)}
            {order.paymentIntent &&
              ` · Cliente declarou: ${PAYMENT_INTENT_LABEL[order.paymentIntent]}`}
          </p>
          {order.paymentIntent === 'cash' && (
            <p className="text-xs font-semibold text-accent">
              {order.cashNeedsChange
                ? `Troco para ${formatCents(order.cashChangeForCents ?? 0)}`
                : 'Sem troco'}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone="primary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
          {isOnAccount(order) && <Badge tone="danger">na conta</Badge>}
        </div>
      </div>

      {/* O que está sendo cobrado, item a item — sem isto o caixa pede um valor
          que nem ele nem o cliente conseguem conferir. */}
      <Card className="mb-4 divide-y divide-border p-0">
        {billed.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="font-medium">
                {item.qty}× {item.name}
              </p>
              <p className="text-xs text-muted">
                {formatCents(item.unitPriceCents)} cada
                {item.notes && ` · ${item.notes}`}
              </p>
            </div>
            <span className="shrink-0 font-semibold">
              {formatCents(item.unitPriceCents * item.qty)}
            </span>
          </div>
        ))}

        {voided.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 p-3 text-muted">
            <div className="min-w-0">
              <p className="line-through">
                {item.qty}× {item.name}
              </p>
              <p className="text-xs">cancelado{item.voidReason && ` · ${item.voidReason}`}</p>
            </div>
            <span className="shrink-0 line-through">
              {formatCents(item.unitPriceCents * item.qty)}
            </span>
          </div>
        ))}

        {billed.length === 0 && (
          <p className="p-3 text-sm text-muted">Nenhum item para cobrar nesta conta.</p>
        )}
      </Card>

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

          {method === 'cash' && (
            <div className="rounded-lg border border-border bg-surface p-3">
              <span className="mb-2 block text-sm font-medium">Precisa de troco?</span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={!cashNeedsChange ? 'primary' : 'ghost'}
                  className="px-3 py-1 text-sm"
                  onClick={() => setCashNeedsChange(false)}
                >
                  Não
                </Button>
                <Button
                  variant={cashNeedsChange ? 'primary' : 'ghost'}
                  className="px-3 py-1 text-sm"
                  onClick={() => setCashNeedsChange(true)}
                >
                  Sim
                </Button>
              </div>

              {cashNeedsChange && (
                <label className="mt-3 block">
                  <span className="mb-1 block text-sm font-medium">Troco para quanto?</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cashChangeFor}
                    placeholder="Ex.: 50,00"
                    onChange={(e) => setCashChangeFor(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
                  />
                  <span className="mt-1 block text-xs text-muted">
                    Informe um valor igual ou maior que {formatCents(paymentAmount)}.
                  </span>
                </label>
              )}
            </div>
          )}

          <Button
            variant="success"
            className="w-full"
            disabled={remaining <= 0 || registerPayment.isPending || !cashChangeIsValid}
            onClick={() =>
              registerPayment.mutate({
                method,
                amountCents: paymentAmount,
                note: paymentNote,
              })
            }
          >
            Registrar {parts > 1 ? '1 parte' : 'pagamento'} · {formatCents(paymentAmount)}
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
          Fechar conta
        </Button>
      )}
    </div>
  );
}
