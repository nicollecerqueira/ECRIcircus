import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { type PaymentChoice, useSession } from '../../core/session.store';
import { Art } from '../../shared/components/art';
import { Button, Card, EmptyState, Kicker, StarDivider } from '../../shared/components/ui';
import { TEAMS } from '../../shared/teams';
import { formatCents, parseMoneyToCents } from '../../shared/utils/money';
import { PAYMENT_LABEL } from '../../shared/utils/whatsapp';
import { useSubmitOrder } from '../order/order.service';

const PAYMENT_OPTIONS: { value: PaymentChoice; icon: string }[] = [
  { value: 'pix', icon: '📱' },
  { value: 'cash', icon: '💵' },
  { value: 'card', icon: '💳' },
  { value: 'account', icon: '🧾' },
];

export function CartComponent() {
  const navigate = useNavigate();
  const cart = useSession((s) => s.cart);
  const removeFromCart = useSession((s) => s.removeFromCart);
  const customerName = useSession((s) => s.customerName);
  const setCustomerName = useSession((s) => s.setCustomerName);
  const teamName = useSession((s) => s.teamName);
  const setTeamName = useSession((s) => s.setTeamName);
  const deliveryRoom = useSession((s) => s.deliveryRoom);
  const setDeliveryRoom = useSession((s) => s.setDeliveryRoom);
  const paymentChoice = useSession((s) => s.paymentChoice);
  const setPaymentChoice = useSession((s) => s.setPaymentChoice);
  const cashNeedsChange = useSession((s) => s.cashNeedsChange);
  const setCashNeedsChange = useSession((s) => s.setCashNeedsChange);
  const cashChangeFor = useSession((s) => s.cashChangeFor);
  const setCashChangeFor = useSession((s) => s.setCashChangeFor);
  const submit = useSubmitOrder();
  /** Item aguardando confirmação de remoção — um por vez. */
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);

  const total = cart.reduce((sum, c) => sum + c.priceCents * c.qty, 0);
  const cashChangeForCents = parseMoneyToCents(cashChangeFor);
  const cashChangeIsValid =
    paymentChoice !== 'cash' ||
    !cashNeedsChange ||
    (cashChangeForCents !== null && cashChangeForCents >= total);
  // Nome + sobrenome. Não bloqueia o envio (há quem tenha nome de uma palavra
  // só, e travar o pedido por isso seria pior), mas avisa: só o primeiro nome
  // repete entre pessoas e é o que gera conta duplicada.
  const hasFullName = customerName.trim().split(/\s+/).length > 1;

  // Os três identificam a entrega: quem é, de que equipe e para onde levar.
  const canSubmit =
    customerName.trim().length > 0 &&
    teamName.length > 0 &&
    deliveryRoom.trim().length > 0 &&
    cashChangeIsValid;

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

      {/* Remover pede confirmação na própria linha (em vez de sumir no primeiro
          toque): o carrinho é mexido com o celular na mão, em pé, e apagar o
          item sem querer só se descobre quando o pedido chega errado. A pergunta
          nasce ABAIXO da linha, longe de onde o dedo acabou de tocar, para o
          segundo toque do mesmo lugar não confirmar o que foi acidente. */}
      <Card className="divide-y divide-border p-0">
        {cart.map((line) => {
          const confirming = confirmingRemoval === line.menuItemId;
          return (
            <div key={line.menuItemId} className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {line.qty}× {line.name}
                  </p>
                  {line.notes && <p className="text-sm text-muted">{line.notes}</p>}
                  <p className="text-sm text-muted">{formatCents(line.priceCents * line.qty)}</p>
                </div>
                {!confirming && (
                  <button
                    type="button"
                    aria-label={`Remover ${line.name} do pedido`}
                    className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium text-danger transition hover:border-danger hover:bg-danger/10"
                    onClick={() => setConfirmingRemoval(line.menuItemId)}
                  >
                    remover
                  </button>
                )}
              </div>

              {confirming && (
                <div className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3">
                  <p className="text-sm font-medium">
                    Tirar {line.qty}× {line.name} do seu pedido?
                  </p>
                  <div className="mt-3 flex gap-2">
                    {/* Cancelar vem primeiro e ocupa mais espaço: numa dúvida, o
                        toque mais fácil tem de ser o que NÃO apaga nada. */}
                    <button
                      type="button"
                      className="flex-1 rounded-lg bg-surface-2 px-3 py-2.5 text-sm font-semibold text-fg transition hover:bg-border"
                      onClick={() => setConfirmingRemoval(null)}
                    >
                      Manter
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-danger px-3 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      onClick={() => {
                        removeFromCart(line.menuItemId);
                        setConfirmingRemoval(null);
                      }}
                    >
                      Sim, tirar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-semibold">Total</span>
        <span className="text-lg font-bold">{formatCents(total)}</span>
      </div>

      <StarDivider className="my-5" />

      {/* O nome é a CHAVE da conta: os pedidos são agrupados por ele. Quem
          escreve "Ana" num pedido e "Ana Silva" no outro acaba com duas contas
          separadas, e o acerto no caixa sai pela metade. Por isso o aviso vem
          antes do campo, e não como dica miúda embaixo. */}
      <div className="mb-3 rounded-lg border border-gold/50 bg-accent/5 p-3">
        <p className="text-sm font-semibold">
          <span aria-hidden>⚠️</span> Escreva seu nome completo
        </p>
        <p className="mt-1 text-sm text-muted">
          Seus pedidos são somados numa conta só pelo nome. Se você escrever de um jeito agora e de
          outro depois, vai acabar com <strong>duas contas separadas</strong> — então use sempre o
          nome completo, do mesmo jeito
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Seu nome completo</span>
        <input
          type="text"
          value={customerName}
          autoComplete="name"
          placeholder="Ex.: Nicolle Cerqueira"
          onChange={(e) => setCustomerName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        />
        {customerName.trim().length > 0 && !hasFullName && (
          <span className="mt-1 block text-xs text-warning">
            Parece faltar o sobrenome — só o primeiro nome costuma repetir entre pessoas.
          </span>
        )}
      </label>

      {/* Nome e equipe identificam a conta no balcão. Sem os dois, o pedido
          chega lá sem ninguém para associar a ele. */}
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium">Sua equipe</span>
        <select
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        >
          <option value="">Selecione…</option>
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-medium">Sala onde você está</span>
        <input
          type="text"
          value={deliveryRoom}
          autoComplete="off"
          placeholder="Ex.: Sala 3"
          onChange={(e) => setDeliveryRoom(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
        />
        <span className="mt-1 block text-xs text-muted">É para lá que levamos seu pedido.</span>
      </label>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium">Forma de pagamento</legend>
        {/* Declaração, não cobrança: o app não processa pagamento. Isto vai no
            relatório do WhatsApp e o caixa registra o pagamento de fato. */}
        <div className="grid grid-cols-2 gap-2">
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
        {/* "Na conta" não é pagar agora: a dica muda para não deixar a pessoa
            achando que precisa acertar neste momento. O pedido é ENTREGUE na
            sala, então o pagamento acontece na entrega, e não no balcão. */}
        <p className="mt-2 text-xs text-muted">
          {paymentChoice === 'account'
            ? 'O pedido fica lançado na sua conta para acertar depois.'
            : 'O pagamento é feito na entrega — aqui você só nos avisa como pretende pagar.'}
        </p>
      </fieldset>

      {paymentChoice === 'cash' && (
        <fieldset className="mt-4 rounded-lg border border-border bg-surface p-3">
          <legend className="px-1 text-sm font-medium">Precisa de troco?</legend>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={!cashNeedsChange}
              onClick={() => setCashNeedsChange(false)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                !cashNeedsChange
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border bg-surface text-fg hover:border-gold'
              }`}
            >
              Não
            </button>
            <button
              type="button"
              aria-pressed={cashNeedsChange}
              onClick={() => setCashNeedsChange(true)}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                cashNeedsChange
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border bg-surface text-fg hover:border-gold'
              }`}
            >
              Sim
            </button>
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
                Informe um valor igual ou maior que {formatCents(total)}.
              </span>
            </label>
          )}
        </fieldset>
      )}

      <Button
        className="mt-5 w-full"
        disabled={submit.isPending || !canSubmit}
        onClick={() =>
          submit.mutate(cart, {
            onSuccess: (order) =>
              navigate({ to: '/track/$orderId', params: { orderId: order.id } }),
          })
        }
      >
        {submit.isPending ? 'Enviando…' : '🎪 Enviar para a cozinha'}
      </Button>
      {!canSubmit && (
        <p className="mt-2 text-center text-xs text-muted">
          Informe seu nome, sua equipe, a sala e os dados de troco para enviar o pedido.
        </p>
      )}
      {submit.isError && (
        <p className="mt-2 text-center text-sm text-danger">
          Não foi possível enviar. Tente novamente.
        </p>
      )}
    </div>
  );
}
