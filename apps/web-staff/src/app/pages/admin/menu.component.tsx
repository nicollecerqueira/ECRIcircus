import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, Card, Spinner } from '../../shared/components/ui';
import { FormField } from '../../shared/form-field';
import { useMenu } from '../order/order.service';
import { type MenuItemForm, menuItemFormSchema, priceToCents, STATIONS } from './admin.model';
import { useCategories, useCreateMenuItem } from './admin.service';
import { ItemRow } from './item-row.component';

export function MenuAdminComponent() {
  const { data: menu, isPending } = useMenu();
  const { data: categories } = useCategories();
  const createItem = useCreateMenuItem();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: { name: '', price: '', categoryId: '', stationId: STATIONS[0].id },
  });

  const onSubmit = handleSubmit((values) => {
    createItem.mutate(
      {
        name: values.name,
        priceCents: priceToCents(values.price),
        categoryId: values.categoryId,
        stationId: values.stationId,
      },
      { onSuccess: () => reset({ ...values, name: '', price: '' }) },
    );
  });

  if (isPending || !menu) {
    return <Spinner />;
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="mb-4 text-xl font-bold">Cardápio</h1>
        <div className="space-y-4">
          {menu.categories.map((cat) => (
            <Card key={cat.id}>
              <h2 className="mb-2 font-semibold">{cat.name}</h2>
              {cat.items.length === 0 ? (
                <p className="text-sm text-muted">Nenhum item nesta categoria.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {cat.items.map((mi) => (
                    <ItemRow key={mi.id} item={mi} />
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted">Novo item</h2>
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <FormField label="Nome" registration={register('name')} error={errors.name} />
            <FormField
              label="Preço (R$)"
              placeholder="32,00"
              registration={register('price')}
              error={errors.price}
            />

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Categoria</span>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-primary"
                {...register('categoryId')}
              >
                <option value="">Selecione…</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && (
                <span className="mt-1 block text-xs text-danger">{errors.categoryId.message}</span>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Estação</span>
              <select
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-primary"
                {...register('stationId')}
              >
                {STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <Button type="submit" className="w-full" disabled={createItem.isPending}>
              {createItem.isPending ? 'Salvando…' : 'Adicionar ao cardápio'}
            </Button>
            {createItem.isError && (
              <p className="text-sm text-danger">Não foi possível salvar o item.</p>
            )}
          </form>
        </Card>
      </aside>
    </div>
  );
}
