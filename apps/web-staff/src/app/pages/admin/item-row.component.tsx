import { useState } from 'react';
import { Badge, Button } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import type { MenuItem } from '../order/order.model';
import { centsToPrice, priceToCents } from './admin.model';
import { useDeleteMenuItem, useUpdateMenuItem } from './admin.service';

/**
 * Linha do cardápio com edição inline (nome/preço) e controle de promoção.
 * Inline em vez de modal: o gerente costuma ajustar vários itens em sequência,
 * e modal a cada item vira clique demais.
 */
export function ItemRow({ item }: { item: MenuItem }) {
  const [editing, setEditing] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const update = useUpdateMenuItem();
  const remove = useDeleteMenuItem();

  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(centsToPrice(item.priceCents));
  const [promoPrice, setPromoPrice] = useState(
    item.promoPriceCents ? centsToPrice(item.promoPriceCents) : '',
  );
  const [promoEnds, setPromoEnds] = useState(item.promoEndsAt?.slice(0, 16) ?? '');

  const save = () => {
    update.mutate(
      { itemId: item.id, name, priceCents: priceToCents(price) },
      { onSuccess: () => setEditing(false) },
    );
  };

  const savePromo = () => {
    update.mutate(
      {
        itemId: item.id,
        promoPriceCents: promoPrice ? priceToCents(promoPrice) : null,
        promoEndsAt: promoEnds ? new Date(promoEnds).toISOString() : null,
      },
      { onSuccess: () => setPromoOpen(false) },
    );
  };

  const clearPromo = () => {
    setPromoPrice('');
    setPromoEnds('');
    update.mutate(
      { itemId: item.id, promoPriceCents: null, promoEndsAt: null },
      { onSuccess: () => setPromoOpen(false) },
    );
  };

  if (editing) {
    return (
      <li className="py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-40 flex-1 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          />
          <Button className="px-3 py-1 text-xs" onClick={save} disabled={update.isPending}>
            Salvar
          </Button>
          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
        {update.isError && <p className="mt-1 text-xs text-danger">Não foi possível salvar.</p>}
      </li>
    );
  }

  return (
    <li className="py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          {item.name} ·{' '}
          {item.onPromo ? (
            <>
              <span className="text-muted line-through">{formatCents(item.priceCents)}</span>
              <span className="font-semibold text-danger">
                {formatCents(item.effectivePriceCents)}
              </span>
            </>
          ) : (
            formatCents(item.priceCents)
          )}
          {item.onPromo && <Badge tone="danger">promo</Badge>}
        </span>
        <div className="flex items-center gap-3">
          <Badge tone={item.available ? 'success' : 'neutral'}>
            {item.available ? 'Disponível' : 'Indisponível'}
          </Badge>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setEditing(true)}
          >
            editar
          </button>
          <button
            type="button"
            aria-pressed={promoOpen}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
              item.onPromo
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-accent/50 text-accent hover:bg-accent/10'
            }`}
            onClick={() => setPromoOpen((v) => !v)}
          >
            {item.onPromo ? 'promoção ativa' : '+ promoção'}
          </button>
          <button
            type="button"
            className="text-xs text-muted hover:underline"
            onClick={() => update.mutate({ itemId: item.id, available: !item.available })}
          >
            {item.available ? 'esgotar' : 'reativar'}
          </button>
          <button
            type="button"
            className="text-xs text-danger hover:underline"
            onClick={() => {
              if (window.confirm(`Excluir "${item.name}" do cardápio?`)) {
                remove.mutate(item.id);
              }
            }}
          >
            excluir
          </button>
        </div>
      </div>

      {promoOpen && (
        <div className="mt-2 rounded-lg border border-accent/40 bg-surface-2 p-3">
          <p className="mb-2 text-xs text-muted">
            Preço promocional (menor que {formatCents(item.priceCents)}). Vale até a data escolhida
            — em branco, vale até você remover.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Preço promo"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              className="w-28 rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            />
            <input
              type="datetime-local"
              value={promoEnds}
              onChange={(e) => setPromoEnds(e.target.value)}
              className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
            />
            <Button className="px-3 py-1 text-xs" onClick={savePromo} disabled={update.isPending}>
              Aplicar
            </Button>
            {item.promoPriceCents !== null && (
              <Button variant="ghost" className="px-3 py-1 text-xs" onClick={clearPromo}>
                Remover promoção
              </Button>
            )}
          </div>
          {update.isError && (
            <p className="mt-2 text-xs text-danger">
              A promoção precisa ser menor que o preço normal.
            </p>
          )}
        </div>
      )}
    </li>
  );
}
