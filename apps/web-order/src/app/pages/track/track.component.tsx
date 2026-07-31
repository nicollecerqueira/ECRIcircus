import { Link, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { realtime } from '../../core/realtime.service';
import { useSession } from '../../core/session.store';
import { Art } from '../../shared/components/art';
import { Badge, Button, Card, Kicker, Spinner, StarDivider } from '../../shared/components/ui';
import { buildOrderReport, whatsappLink } from '../../shared/utils/whatsapp';
import { STATE_LABEL } from '../order/order.model';
import { useDinerOrder } from '../order/order.service';

/** ready = verde (ação concluída); preparing = dourado (em curso); resto neutro. */
const STATE_TONE: Record<string, string> = {
  queued: 'neutral',
  preparing: 'accent',
  ready: 'success',
  served: 'neutral',
};

/**
 * Envio do relatório para o WhatsApp da casa.
 *
 * O texto é montado a partir do pedido que voltou da API (não do carrinho, que
 * é limpo no envio) — assim um refresh nesta tela ainda consegue remontar a
 * mensagem. Sem número configurado, mostra o texto para copiar em vez de um
 * link quebrado.
 */
function WhatsappReport({
  orderId,
  lines,
}: {
  orderId: string;
  lines: { name: string; qty: number; priceCents: number }[];
}) {
  const customerName = useSession((s) => s.customerName);
  const paymentChoice = useSession((s) => s.paymentChoice);
  const [copied, setCopied] = useState(false);

  const report = buildOrderReport({ orderId, customerName, paymentChoice, lines });
  const link = whatsappLink(report);

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="mt-4 block">
        <Button className="w-full">💬 Enviar pedido no WhatsApp</Button>
      </a>
    );
  }

  return (
    <Card className="mt-4">
      <p className="text-sm font-medium">Relatório do pedido</p>
      <p className="mt-1 text-xs text-muted">
        O WhatsApp da casa ainda não foi configurado (<code>VITE_WHATSAPP_NUMERO</code>). Copie o
        texto abaixo e envie manualmente.
      </p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3 text-xs">
        {report}
      </pre>
      <Button
        variant="ghost"
        className="mt-3 w-full"
        onClick={() => {
          navigator.clipboard.writeText(report).then(() => setCopied(true));
        }}
      >
        {copied ? 'Copiado ✓' : 'Copiar relatório'}
      </Button>
    </Card>
  );
}

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
      <header className="pt-6 text-center">
        {/* A arte conta o mesmo que o texto abaixo: foca equilibrando =
            número em ensaio; ingresso = pode entrar, está pronto. */}
        {allReady ? (
          <Art name="ticket" size="md" fallback="🎟️" />
        ) : (
          <Art name="seal" size="xl" fallback="🤹" />
        )}
        <Kicker>{allReady ? 'Pode entrar' : 'Nos bastidores'}</Kicker>
        <h1 className="circus-title mt-1 text-3xl font-bold">Seu pedido</h1>
        <p className="mt-1 text-muted">
          {allReady ? 'Tudo pronto! 🎉' : 'O número está em ensaio — acompanhe em tempo real.'}
        </p>
        <StarDivider className="my-4" />
      </header>

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

      <WhatsappReport
        orderId={order.id}
        lines={active.map((i) => ({ name: i.name, qty: i.qty, priceCents: i.unitPriceCents }))}
      />

      <Link to="/menu" className="mt-3 block">
        <Button variant="ghost" className="w-full">
          🎠 Pedir mais
        </Button>
      </Link>
    </div>
  );
}
