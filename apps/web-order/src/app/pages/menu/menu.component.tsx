import { Art, Attractions } from '../../shared/components/art';
import {
  Badge,
  Card,
  EmptyState,
  Kicker,
  PosterHeading,
  Spinner,
  StarDivider,
} from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import { useMenu } from '../order/order.service';

export function MenuComponent() {
  const { data: menu, isPending } = useMenu();

  if (isPending || !menu) {
    return <Spinner />;
  }

  const categories = menu.categories.filter((cat) => cat.items.length > 0);

  return (
    <div className="mx-auto max-w-lg p-4">
      <header className="mb-5 pt-6 text-center">
        <Art name="tent" size="md" fallback="🎪" />
        <Kicker>O grande espetáculo</Kicker>
        <h1 className="circus-title mt-1 text-3xl font-bold">Cardápio</h1>
        <StarDivider className="my-4" />
      </header>

      {categories.length === 0 ? (
        <EmptyState
          icon={<Art name="rabbitHat" size="lg" fallback="🎩" />}
          title="O picadeiro está sendo montado"
          hint="Ainda não há itens disponíveis. Volte daqui a pouco."
        />
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <section key={cat.id}>
              <PosterHeading>{cat.name}</PosterHeading>
              <div className="space-y-2">
                {cat.items.map((mi) => (
                  <Card key={mi.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`flex flex-wrap items-center gap-2 font-medium ${mi.available ? '' : 'text-muted'}`}
                      >
                        <span className={mi.available ? '' : 'line-through'}>{mi.name}</span>
                        {mi.isCombo && <Badge tone="primary">combo</Badge>}
                        {mi.onPromo && <Badge tone="danger">promo</Badge>}
                        {!mi.available && <Badge tone="neutral">esgotado</Badge>}
                      </p>
                      {mi.isCombo && mi.comboItems && (
                        <p className="mt-1 text-sm text-muted">{mi.comboItems}</p>
                      )}
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
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* O cardápio virou a tela de entrada do app — é aqui que o elenco
          aparece, senão as outras ilustrações ficam invisíveis. */}
      <StarDivider className="my-8" />
      <div className="text-center">
        <Kicker>Atrações da casa</Kicker>
        <Attractions className="mt-4" />
      </div>
    </div>
  );
}
