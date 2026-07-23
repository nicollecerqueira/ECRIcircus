import { useParams } from '@tanstack/react-router';
import { Card, Spinner } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useMenu } from '../order/order.service';

/** Public delivery storefront (`/d/$slug`). First-party delivery, no table. */
export function StorefrontComponent() {
  const { slug } = useParams({ from: '/d/$slug' });
  // O slug da URL (/d/$slug) identifica a marca no cardápio público.
  const { data: menu, isPending } = useMenu({ brandSlug: slug });

  if (isPending || !menu) {
    return <Spinner />;
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold capitalize">{slug.replace(/-/g, ' ')}</h1>
        <p className="text-muted">Entrega própria · faça seu pedido online</p>
      </div>
      <div className="space-y-5">
        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase text-muted">{cat.name}</h2>
            <div className="space-y-2">
              {cat.items
                .filter((mi) => mi.available)
                .map((mi) => (
                  <Card key={mi.id} className="flex items-center justify-between">
                    <span className="font-medium">{mi.name}</span>
                    <span className="text-sm text-muted">{formatCents(mi.priceCents)}</span>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
