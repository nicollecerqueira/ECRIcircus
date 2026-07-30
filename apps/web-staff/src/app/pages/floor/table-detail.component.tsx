import { useNavigate, useParams } from '@tanstack/react-router';
import { Badge, Button, Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import {
  ITEM_STATE_LABEL,
  ITEM_STATE_TONE,
  isActiveOrder,
  orderTotalCents,
} from '../order/order.model';
import { useCreateOrder, useOrders } from '../order/order.service';
import { useTables } from './floor.service';

export function TableDetailComponent() {
  const { id } = useParams({ from: '/shell/floor/table/$id' });
  const navigate = useNavigate();
  const { data: orders, isPending, isError } = useOrders();
  const { data: tables } = useTables();
  const createOrder = useCreateOrder();

  if (isPending) {
    return <Spinner />;
  }

  // Sem isto, uma leitura que falha cai no mesmo caminho de "não há pedido" e a
  // tela mente: mostra "Mesa sem pedido aberto" para uma mesa que pode ter conta.
  if (isError) {
    return (
      <div className="mx-auto max-w-lg p-4 sm:p-6">
        <Card>
          <p className="text-danger">Não foi possível carregar os pedidos desta mesa.</p>
          <div className="mt-4">
            <Button variant="ghost" onClick={() => navigate({ to: '/floor' })}>
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Número humano vem da mesa (o id agora é UUID); cai no id só se ainda carregando.
  const table = tables?.find((t) => t.id === id);
  const tableLabel = table ? `Mesa ${table.number}` : 'Mesa';

  // O backend garante uma conta aberta por mesa, então aqui há 0 ou 1.
  const openOrder = (orders ?? []).find((o) => o.tableId === id && isActiveOrder(o));

  const goToOrder = (orderId: string) => navigate({ to: '/order/$id', params: { id: orderId } });

  return (
    <div className="mx-auto max-w-lg p-4 sm:p-6">
      <h1 className="mb-4 text-xl font-bold">{tableLabel}</h1>

      {openOrder ? (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-semibold">Pedido em andamento</span>
            <Badge tone="primary">{openOrder.status}</Badge>
          </div>

          {openOrder.items.length === 0 ? (
            <p className="text-muted">Conta aberta, ainda sem itens lançados.</p>
          ) : (
            <ul className="divide-y divide-border">
              {openOrder.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2">
                  <span className={item.state === 'voided' ? 'text-muted line-through' : ''}>
                    {item.qty}× {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted">
                      {formatCents(item.unitPriceCents * item.qty)}
                    </span>
                    <Badge tone={ITEM_STATE_TONE[item.state]}>{ITEM_STATE_LABEL[item.state]}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatCents(orderTotalCents(openOrder))}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => goToOrder(openOrder.id)}>Adicionar itens</Button>
            <Button
              variant="ghost"
              onClick={() =>
                navigate({
                  to: '/pos/checkout/$orderId',
                  params: { orderId: openOrder.id },
                })
              }
            >
              Fechar conta
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: '/floor' })}>
              Voltar
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-muted">Mesa sem pedido aberto.</p>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() =>
                createOrder.mutate(
                  { channel: 'waiter', tableId: id },
                  { onSuccess: (order) => goToOrder(order.id) },
                )
              }
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? 'Abrindo…' : 'Abrir pedido'}
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: '/floor' })}>
              Voltar
            </Button>
          </div>
          {createOrder.isError && (
            <p className="mt-3 text-sm text-danger">
              Não foi possível abrir o pedido. Tente de novo.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
