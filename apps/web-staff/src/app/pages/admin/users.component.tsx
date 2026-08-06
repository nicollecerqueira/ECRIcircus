import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTenant } from '../../core/tenant.context';
import { Art } from '../../shared/components/art';
import { Button, Card, Spinner } from '../../shared/components/ui';
import { FormField } from '../../shared/form-field';
import { UserRow } from './user-row.component';
import { ASSIGNABLE_ROLES, type NewUserForm, newUserFormSchema } from './users.model';
import { apiErrorMessage, useCreateStaffUser, useStaffUsers } from './users.service';

/**
 * Contas de acesso — tela EXCLUSIVA do dono (rota e API exigem `brand_owner`).
 *
 * Existe porque até aqui os únicos logins eram os do seed: para dar acesso a mais
 * alguém era preciso mexer no banco. Agora o dono cria a conta, escolhe o que ela
 * alcança e redefine a senha quando alguém esquece.
 */
export function UsersAdminComponent() {
  const { userId } = useTenant();
  const { data: users, isPending, isError } = useStaffUsers();
  const createUser = useCreateStaffUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<NewUserForm>({
    resolver: zodResolver(newUserFormSchema),
    defaultValues: { name: '', email: '', password: '', role: 'waiter' },
  });

  const onSubmit = handleSubmit((values) => {
    createUser.mutate(
      {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
        role: values.role,
      },
      { onSuccess: () => reset({ name: '', email: '', password: '', role: values.role }) },
    );
  });

  const chosenRole = ASSIGNABLE_ROLES.find((r) => r.value === watch('role'));

  return (
    <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[1fr_340px]">
      <section>
        <h1 className="circus-wordmark mb-1 flex items-center gap-3 text-xl font-bold">
          <Art name="rabbitHat" size="sm" fallback="🎩" />
          Contas de acesso
        </h1>
        <p className="mb-4 text-sm text-muted">
          Quem entra no app da equipe e até onde vai. Só você, como dono, enxerga esta tela.
        </p>

        {isPending ? (
          <Spinner />
        ) : isError ? (
          <p className="text-danger">Falha ao carregar as contas de acesso.</p>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {users.map((u) => (
                <UserRow key={u.id} user={u} isSelf={u.id === userId} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <aside>
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted">Nova conta</h2>
        <Card>
          <form onSubmit={onSubmit} className="space-y-3">
            <FormField
              label="Nome"
              placeholder="Ex.: Nicolle Cerqueira"
              registration={register('name')}
              error={errors.name}
            />
            <FormField
              label="E-mail"
              type="email"
              autoComplete="off"
              placeholder="nome@ecricircus.app"
              registration={register('email')}
              error={errors.email}
            />
            {/* Sem máscara de senha: quem cria a conta precisa ler o que digitou
                para repassar à pessoa — não existe "esqueci minha senha" aqui. */}
            <FormField
              label="Senha provisória"
              autoComplete="off"
              placeholder="mínimo 6 caracteres"
              registration={register('password')}
              error={errors.password}
            />

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-fg">Acesso</span>
              <select
                {...register('role')}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {/* O que o papel alcança, na hora da escolha: "Caixa" e "Balcão"
                  não dizem sozinhos quais telas a pessoa vai ver. */}
              {chosenRole && (
                <span className="mt-1 block text-xs text-muted">{chosenRole.access}</span>
              )}
              {errors.role && (
                <span className="mt-1 block text-xs text-danger">{errors.role.message}</span>
              )}
            </label>

            <Button type="submit" className="w-full" disabled={createUser.isPending}>
              {createUser.isPending ? 'Criando…' : 'Criar conta'}
            </Button>

            {createUser.isError && (
              <p className="text-sm text-danger">
                {apiErrorMessage(createUser.error, 'Não foi possível criar a conta.')}
              </p>
            )}
            {createUser.isSuccess && !createUser.isPending && (
              <p className="text-sm text-success">
                Conta criada. Passe o e-mail e a senha para a pessoa.
              </p>
            )}
          </form>
        </Card>
      </aside>
    </div>
  );
}
