import { useNavigate } from '@tanstack/react-router';
import { Art } from '../../shared/components/art';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useTables } from '../floor/floor.service';
import { useCreateOrder, useOrders } from '../order/order.service';
import { billsGrandTotalCents, buildBills } from './pos.model';

export function PosComponent() {
  const { data: orders, isPending } = useOrders();
  const { data: tables } = useTables();
  const createOrder = useCreateOrder();
  const navigate = useNavigate();

  if (isPending) {
    return <Spinner />;
  }

  // Uma conta por mesa (somando seus pedidos), e uma por pedido de balcão/delivery.
  const tableNumbers = new Map((tables ?? []).map((t) => [t.id, t.number]));
  const bills = buildBills(orders ?? [], tableNumbers);
  const grandTotal = billsGrandTotalCents(bills);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="circus-wordmark flex items-center gap-3 text-xl font-bold">
            <Art name="popcornBucket" size="sm" fallback="🍿" />
            Caixa (POS)
          </h1>
          <p className="text-sm text-muted">
            {bills.length} conta(s) em aberto · a receber{' '}
            <span className="font-semibold text-fg">{formatCents(grandTotal)}</span>
          </p>
        </div>
        <Button
          onClick={() =>
            createOrder.mutate(
              { channel: 'pos' },
              { onSuccess: (o) => navigate({ to: '/order/$id', params: { id: o.id } }) },
            )
          }
        >
          Novo balcão
        </Button>
      </div>

      {bills.length === 0 ? (
        <div className="py-8 text-center">
          <Art name="popcornBucket" size="lg" fallback="🍿" className="mb-2" />
          <p className="text-muted">Nenhuma conta em aberto.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {bills.map((bill) => {
            const remaining = bill.totalCents - bill.paidCents;
            const itemCount = bill.orders.reduce(
              (n, o) => n + o.items.filter((i) => i.state !== 'voided').length,
              0,
            );
            return (
              <button
                key={bill.key}
                type="button"
                className="text-left"
                onClick={() =>
                  navigate({
                    to: '/pos/checkout/$orderId',
                    params: { orderId: bill.primaryOrderId },
                  })
                }
              >
                <Card className="transition hover:border-primary">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{bill.label}</span>
                    <Badge tone={bill.paidCents > 0 ? 'accent' : 'primary'}>
                      {bill.orders[0].status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-lg font-bold">{formatCents(bill.totalCents)}</p>
                  <p className="text-xs text-muted">
                    {itemCount} itens
                    {bill.orders.length > 1 && ` · ${bill.orders.length} pedidos somados`}
                  </p>
                  {bill.paidCents > 0 && (
                    <p className="mt-1 text-xs text-accent">
                      pago {formatCents(bill.paidCents)} · falta {formatCents(remaining)}
                    </p>
                  )}
                </Card>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
