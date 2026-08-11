import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLogin } from '../../core/auth.service';
import { useAuthStore } from '../../core/auth.store';
import { Art } from '../../shared/components/art';
import { Button } from '../../shared/components/ui';
import { FormField } from '../../shared/form-field';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

export function LoginComponent() {
  const navigate = useNavigate();
  const { redirect, expirado } = useSearch({ strict: false }) as {
    redirect?: string;
    expirado?: string;
  };
  const lastEmail = useAuthStore((s) => s.lastEmail);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: lastEmail ?? '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate({ to: redirect ?? '/floor' }),
    });
  });

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div aria-hidden className="circus-stripes -mx-6 -mt-6" />
        <div className="text-center">
          <Art name="tent" size="lg" fallback="🎪" />
          <h1 className="circus-wordmark text-2xl font-bold">ECRI Circus</h1>
          <p className="text-sm text-muted">Entre para acessar o salão e o caixa.</p>
        </div>
        {expirado === '1' && (
          <p className="rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent">
            Sua sessão saiu por 10 minutos sem uso. Entre novamente.
          </p>
        )}

        <FormField
          label="E-mail"
          type="email"
          autoComplete="username"
          registration={register('email')}
          error={errors.email}
        />
        <FormField
          label="Senha"
          type="password"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password}
        />
        {login.isError && <p className="text-sm text-danger">Credenciais inválidas.</p>}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
        {/* A lista é COMPLETA de propósito: mostrar só duas contas fazia parecer
            que as outras não existiam — quem precisava do cardápio não achava a
            conta que abre o admin. */}
        <div className="rounded-lg bg-surface-2 p-3 text-xs text-muted">
          <p className="text-center font-semibold text-fg">
            Contas do ECRI · senha <span className="font-mono">ecri123</span>
          </p>
          <ul className="mt-2 space-y-0.5">
            <li>
              <span className="font-medium text-fg">owner@</span> — dono: salão, caixa e cardápio
            </li>
            <li>
              <span className="font-medium text-fg">manager@</span> — gerência: o mesmo que o dono
            </li>
            <li>
              <span className="font-medium text-fg">waiter@</span> — balcão: salão e pedidos
            </li>
            <li>
              <span className="font-medium text-fg">cashier@</span> — caixa: salão e pagamentos
            </li>
          </ul>
          <p className="mt-2 text-center">
            todas terminam em <span className="font-medium text-fg">@ecricircus.app</span>
          </p>
        </div>
      </form>
    </div>
  );
}
