import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge, Button, IconButton } from '../../shared/components/ui';
import { formatCents } from '../../shared/utils/money';
import type { MenuItem } from '../order/order.model';
import { type Category, centsToPrice, priceToCents } from './admin.model';
import { useDeleteMenuItem, useUpdateMenuItem } from './admin.service';

/** Ícone base 16px, traço em currentColor — herda a cor do IconButton. */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PencilIcon = () => (
  <Icon>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </Icon>
);
const TagIcon = () => (
  <Icon>
    <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
    <path d="M7 7h.01" />
  </Icon>
);
const EyeIcon = () => (
  <Icon>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);
const EyeOffIcon = () => (
  <Icon>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.12 9.12 0 0 0 5.39-1.61" />
    <path d="m9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M2 2l20 20" />
  </Icon>
);
const TrashIcon = () => (
  <Icon>
    <path d="M3 6h18" />
    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
    <path d="M19 6v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6" />
    <path d="M10 11v6M14 11v6" />
  </Icon>
);

/**
 * Linha do cardápio com edição inline (nome/preço/categoria) e controle de
 * promoção. Inline em vez de modal: o gerente costuma ajustar vários itens em
 * sequência, e modal a cada item vira clique demais.
 */
export function ItemRow({ item, categories }: { item: MenuItem; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const update = useUpdateMenuItem();
  const remove = useDeleteMenuItem();

  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(centsToPrice(item.priceCents));
  const [categoryId, setCategoryId] = useState(item.categoryId ?? '');
  const [isCombo, setIsCombo] = useState(item.isCombo);
  const [comboItems, setComboItems] = useState(item.comboItems ?? '');
  const [promoPrice, setPromoPrice] = useState(
    item.promoPriceCents ? centsToPrice(item.promoPriceCents) : '',
  );
  const [promoEnds, setPromoEnds] = useState(item.promoEndsAt?.slice(0, 16) ?? '');

  const save = () => {
    update.mutate(
      {
        itemId: item.id,
        name,
        priceCents: priceToCents(price),
        categoryId,
        isCombo,
        comboItems,
      },
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
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button className="px-3 py-1 text-xs" onClick={save} disabled={update.isPending}>
            Salvar
          </Button>
          <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isCombo} onChange={(e) => setIsCombo(e.target.checked)} />
          É combo
        </label>
        <textarea
          rows={2}
          value={comboItems}
          placeholder="Itens do combo"
          onChange={(e) => setComboItems(e.target.value)}
          className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1 text-sm"
        />
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
          {item.isCombo && <Badge tone="primary">combo</Badge>}
          {item.onPromo && <Badge tone="danger">promo</Badge>}
          {/* Sem este selo, item que não vai para a cozinha fica igual aos
              outros na lista, e só se descobre o engano quando a comanda não
              aparece (ou aparece) no painel. */}
          {!item.requiresPreparation && <Badge tone="neutral">sem preparo</Badge>}
        </span>
        <div className="flex items-center gap-2">
          <Badge tone={item.available ? 'success' : 'neutral'}>
            {item.available ? 'Disponível' : 'Indisponível'}
          </Badge>
          <div className="flex items-center gap-0.5">
            <IconButton label="Editar" onClick={() => setEditing(true)}>
              <PencilIcon />
            </IconButton>
            <IconButton
              label={item.onPromo ? 'Promoção ativa' : 'Criar promoção'}
              active={promoOpen || item.onPromo}
              onClick={() => setPromoOpen((v) => !v)}
            >
              <TagIcon />
            </IconButton>
            <IconButton
              label={item.available ? 'Marcar como esgotado' : 'Reativar'}
              disabled={update.isPending}
              onClick={() => update.mutate({ itemId: item.id, available: !item.available })}
            >
              {item.available ? <EyeOffIcon /> : <EyeIcon />}
            </IconButton>
            <IconButton
              label="Excluir do cardápio"
              tone="danger"
              onClick={() => {
                if (window.confirm(`Excluir "${item.name}" do cardápio?`)) {
                  remove.mutate(item.id);
                }
              }}
            >
              <TrashIcon />
            </IconButton>
          </div>
        </div>
      </div>
      {item.isCombo && item.comboItems && (
        <p className="mt-1 text-sm text-muted">{item.comboItems}</p>
      )}

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
