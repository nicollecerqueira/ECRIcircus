import { useNavigate } from '@tanstack/react-router';
import { type PaymentChoice, useSession } from '../../core/session.store';
import { Art } from '../../shared/components/art';
import { Button, Card, EmptyState, Kicker, StarDivider } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { PAYMENT_LABEL } from '../../shared/utils/whatsapp';
import { useSubmitOrder } from '../order/order.service';

const PAYMENT_OPTIONS: { value: PaymentChoice; icon: string }[] = [
  { value: 'pix', icon: '📱' },
  { value: 'cash', icon: '💵' },
  { value: 'card', icon: '💳' },
];

export function CartComponent() {
  const navigate = useNavigate();
  const cart = useSession((s) => s.cart);
  const removeFromCart = useSession((s) => s.removeFromCart);
  const customerName = useSession((s) => s.customerName);
  const setCustomerName = useSession((s) => s.setCustomerName);
  const paymentChoice = useSession((s) => s.paymentChoice);
  const setPaymentChoice = useSession((s) => s.setPaymentChoice);
  const submit = useSubmitOrder();

  const total = cart.reduce((sum, c) => sum + c.priceCents * c.qty, 0);

  if (cart.length === 0) {
    return (
      <EmptyState
        icon={<Art name="popcornBucket" size="lg" fallback="🍿" />}
        title="Seu carrinho está vazio"
        hint="Adicione itens do cardápio para montar seu espetáculo."
      >
        <Button variant="ghost" onClick={() => navigate({ to: '/menu' })}>
          Ver cardápio
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="pt-6 text-center">
        <Art name="ticket" size="md" className="mb-2" />
        <Kicker>Seu ingresso</Kicker>
        <h1 className="circus-title mt-1 text-3xl font-bold">Seu pedido</h1>
        <StarDivider className="my-4" />
      </header>

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

      <StarDivider className="my-5" />

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Seu nome</span>
        <input
          type="text"
          value={customerName}
          autoComplete="name"
          placeholder="Para chamarmos quando ficar pronto"
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
        {/* Declaração, não cobrança: o app não processa pagamento. Isto vai no
            relatório do WhatsApp e o caixa registra o pagamento de fato. */}
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={paymentChoice === opt.value}
              onClick={() => setPaymentChoice(opt.value)}
              className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                paymentChoice === opt.value
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border bg-surface text-fg hover:border-gold'
              }`}
            >
              <span aria-hidden className="mr-1">
                {opt.icon}
              </span>
              {PAYMENT_LABEL[opt.value]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          O pagamento é feito no balcão — aqui você só nos avisa como pretende pagar.
        </p>
      </fieldset>

      <Button
        className="mt-5 w-full"
        disabled={submit.isPending}
        onClick={() =>
          submit.mutate(cart, {
            onSuccess: (order) =>
              navigate({ to: '/track/$orderId', params: { orderId: order.id } }),
          })
        }
      >
        {submit.isPending ? 'Enviando…' : '🎪 Enviar para a cozinha'}
      </Button>
      {submit.isError && (
        <p className="mt-2 text-center text-sm text-danger">
          Não foi possível enviar. Tente novamente.
        </p>
      )}
    </div>
  );
}
