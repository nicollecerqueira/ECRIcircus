import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLogin } from '../../core/auth.service';
import { useAuthStore } from '../../core/auth.store';
import { Art } from '../../shared/components/art';
import { Button } from '../../shared/components/ui';

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
    defaultValues: { email: lastEmail ?? 'kitchen@ecricircus.app', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, { onSuccess: () => navigate({ to: redirect ?? '/' }) });
  });

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 overflow-hidden rounded-2xl border border-border bg-surface p-6"
      >
        <div aria-hidden className="circus-stripes -mx-6 -mt-6" />
        <div className="text-center">
          <Art name="tent" size="lg" fallback="🎪" />
          <h1 className="circus-wordmark text-2xl font-bold">ECRI Circus · Cozinha</h1>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">E-mail</span>
          <input
            type="email"
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
            {...register('email')}
          />
          {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-primary"
            {...register('password')}
          />
          {errors.password && (
            <span className="text-xs text-danger">{errors.password.message}</span>
          )}
        </label>
        {expirado === '1' && (
          <p className="rounded-lg bg-accent/15 px-3 py-2 text-sm text-accent">
            A sessão saiu por 10 minutos sem uso. Entre novamente.
          </p>
        )}
        {login.isError && <p className="text-sm text-danger">Credenciais inválidas.</p>}
        <Button type="submit" className="w-full" disabled={login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
        <p className="text-center text-xs text-muted">
          Cozinha: kitchen@ecricircus.app · senha ecri123
        </p>
      </form>
    </div>
  );
}
