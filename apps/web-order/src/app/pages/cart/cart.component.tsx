import { useNavigate } from '@tanstack/react-router';
import { useSession } from '../../core/session.store';
import { Button, Card } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useSubmitOrder } from '../order/order.service';

export function CartComponent() {
  const navigate = useNavigate();
  const cart = useSession((s) => s.cart);
  const removeFromCart = useSession((s) => s.removeFromCart);
  const submit = useSubmitOrder();

  const total = cart.reduce((sum, c) => sum + c.priceCents * c.qty, 0);

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-lg p-6 text-center">
        <p className="text-muted">Seu carrinho está vazio.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate({ to: '/menu' })}>
          Voltar ao cardápio
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <h1 className="mb-4 text-2xl font-bold">Seu pedido</h1>
      <Card className="divide-y divide-border p-0">
        {cart.map((line) => (
          <div key={line.menuItemId} className="flex items-center justify-between p-3">
            <div>
              <p className="font-medium">
                {line.qty}× {line.name}
              </p>
              <p className="text-sm text-muted">{formatCents(line.priceCents * line.qty)}</p>
            </div>
            <button
              type="button"
              className="text-sm text-danger hover:underline"
              onClick={() => removeFromCart(line.menuItemId)}
            >
              remover
            </button>
          </div>
        ))}
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{formatCents(total)}</span>
      </div>

      <Button
        className="mt-4 w-full"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate(cart, {
            onSuccess: (order) =>
              navigate({ to: '/track/$orderId', params: { orderId: order.id } }),
          })
        }
      >
        {submit.isPending ? 'Enviando…' : 'Enviar para a cozinha'}
      </Button>
      {submit.isError && (
        <p className="mt-2 text-center text-sm text-danger">
          Não foi possível enviar. Tente novamente.
        </p>
      )}
    </div>
  );
}
