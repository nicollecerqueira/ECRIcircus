import { useParams } from '@tanstack/react-router';
import { Art } from '../../shared/components/art';
import { Card, Kicker, PosterHeading, Spinner, StarDivider } from '../../shared/components/ui';
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
      <header className="mb-5 pt-6 text-center">
        <Art name="tent" size="xl" fallback="🎪" />
        <Kicker>Entrega própria</Kicker>
        <h1 className="circus-title mt-1 text-3xl font-bold capitalize">
          {slug.replace(/-/g, ' ')}
        </h1>
        <p className="text-muted">Faça seu pedido online</p>
        <StarDivider className="my-4" />
      </header>
      <div className="space-y-5">
        {menu.categories.map((cat) => (
          <section key={cat.id}>
            <PosterHeading>{cat.name}</PosterHeading>
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
