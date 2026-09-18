import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Art } from '../../shared/components/art';
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

  const defaultValues: MenuItemForm = {
    name: '',
    price: '',
    categoryId: '',
    stationId: STATIONS[0].id,
    isCombo: false,
    comboItems: '',
    semPreparo: false,
  };

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<MenuItemForm>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues,
  });

  const onSubmit = handleSubmit((values) => {
    createItem.mutate(
      {
        name: values.name,
        priceCents: priceToCents(values.price),
        categoryId: values.categoryId,
        stationId: values.stationId,
        isCombo: values.isCombo,
        comboItems: values.comboItems,
        requiresPreparation: !values.semPreparo,
      },
      {
        // Lê os valores NA HORA do sucesso (getValues), não os capturados no
        // fechamento do submit: a resposta da rede pode demorar, e nesse
        // intervalo a pessoa já pode ter mudado categoria/estação para o
        // próximo item. Resetar com o closure antigo apagava essa escolha e
        // deixava o formulário num estado que parecia preenchido na tela mas
        // que o RHF via como divergente do que tinha sido validado — daí o
        // "informe nome e preço" mesmo com os campos visivelmente cheios.
        onSuccess: () =>
          // A categoria, a estação e "sem preparo" ficam: quem cadastra fichas
          // cadastra várias seguidas, e refazer a escolha a cada uma é atrito.
          reset({ ...getValues(), name: '', price: '', isCombo: false, comboItems: '' }),
      },
    );
  });

  if (isPending || !menu) {
    return <Spinner />;
  }

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h1 className="circus-wordmark mb-4 flex items-center gap-3 text-xl font-bold">
          <Art name="rabbitHat" size="sm" fallback="🎩" />
          Cardápio
        </h1>
        <div className="space-y-4">
          {menu.categories.map((cat) => (
            <Card key={cat.id}>
              <h2 className="mb-2 font-semibold">{cat.name}</h2>
              {cat.items.length === 0 ? (
                <p className="text-sm text-muted">Nenhum item nesta categoria.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {cat.items.map((mi) => (
                    <ItemRow key={mi.id} item={mi} categories={categories ?? []} />
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

            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium">
              <input type="checkbox" {...register('isCombo')} />É combo
            </label>

            <label className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium">
              <input type="checkbox" className="mt-0.5" {...register('semPreparo')} />
              <span>
                <span className="block">Não passa pela cozinha</span>
                <span className="mt-0.5 block text-xs font-normal text-muted">
                  Para fichas e créditos: entra na conta e no relatório, mas não vira comanda no
                  painel da cozinha.
                </span>
              </span>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Itens do combo</span>
              <textarea
                rows={3}
                placeholder="Ex.: cachorro-quente + refrigerante"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg outline-none focus:border-primary"
                {...register('comboItems')}
              />
            </label>

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
