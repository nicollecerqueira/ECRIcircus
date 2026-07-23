import { Link } from '@tanstack/react-router';
import { useSession } from '../../core/session.store';
import { Button, Card, Spinner } from '../../shared/components/ui';
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

  return (
    <div className="mx-auto max-w-lg p-4 pb-24">
      <h1 className="mb-4 text-2xl font-bold">Cardápio</h1>
      <div className="space-y-5">
        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase text-muted">{cat.name}</h2>
            <div className="space-y-2">
              {cat.items.map((mi) => (
                <Card key={mi.id} className="flex items-center justify-between">
                  <div>
                    <p
                      className={
                        mi.available ? 'font-medium' : 'font-medium text-muted line-through'
                      }
                    >
                      {mi.name}
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

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface p-4">
          <Link to="/cart" className="mx-auto block max-w-lg">
            <Button className="w-full">Ver carrinho · {cartCount} item(s)</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
