import { Link } from '@tanstack/react-router';
import { useSession } from '../../core/session.store';
import { Badge, Button, Card, EmptyState, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useMenu } from '../order/order.service';

export function MenuComponent() {
  const locationId = useSession((s) => s.locationId);
  const { data: menu, isPending } = useMenu({ locationId });
  const cart = useSession((s) => s.cart);
  const addToCart = useSession((s) => s.addToCart);

  if (isPending || !menu) {
    return <Spinner />;
  }

  const cartCount = cart.reduce((n, c) => n + c.qty, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.priceCents * c.qty, 0);
  const categories = menu.categories.filter((cat) => cat.items.length > 0);

  return (
    <div className="mx-auto max-w-lg p-4 pb-28">
      <h1 className="mb-4 text-2xl font-bold">Cardápio</h1>

      {categories.length === 0 ? (
        <EmptyState
          icon="🍽️"
          title="Cardápio a caminho"
          hint="Ainda não há itens disponíveis nesta mesa. Se precisar, chame o garçom."
        />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-2 border-b border-border pb-1 text-sm font-semibold uppercase tracking-wide text-muted">
                {cat.name}
              </h2>
              <div className="space-y-2">
                {cat.items.map((mi) => (
                  <Card key={mi.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`flex flex-wrap items-center gap-2 font-medium ${mi.available ? '' : 'text-muted'}`}
                      >
                        <span className={mi.available ? '' : 'line-through'}>{mi.name}</span>
                        {mi.onPromo && <Badge tone="danger">promo</Badge>}
                        {!mi.available && <Badge tone="neutral">esgotado</Badge>}
                      </p>
                      {mi.onPromo ? (
                        <p className="text-sm">
                          <span className="text-muted line-through">
                            {formatCents(mi.priceCents)}
                          </span>{' '}
                          <span className="font-semibold text-danger">
                            {formatCents(mi.effectivePriceCents)}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted">{formatCents(mi.priceCents)}</p>
                      )}
                    </div>
                    <Button
                      disabled={!mi.available}
                      className="shrink-0"
                      onClick={() =>
                        addToCart({
                          menuItemId: mi.id,
                          name: mi.name,
                          // Preço que o cliente paga agora (promocional, se houver). O
                          // servidor recongela isto ao lançar; aqui é só o que ele vê.
                          priceCents: mi.effectivePriceCents,
                          qty: 1,
                        })
                      }
                    >
                      Adicionar
                    </Button>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link to="/cart" className="mx-auto block max-w-lg">
            <Button className="w-full">
              Ver carrinho · {cartCount} {cartCount === 1 ? 'item' : 'itens'} ·{' '}
              {formatCents(cartTotal)}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
