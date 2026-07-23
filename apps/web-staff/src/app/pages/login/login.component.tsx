import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLogin } from '../../core/auth.service';
import { useAuthStore } from '../../core/auth.store';
import { Button } from '../../shared/components/ui';
import { FormField } from '../../shared/form-field';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type LoginForm = z.infer<typeof schema>;

export function LoginComponent() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };
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
        className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold text-primary">Prato</h1>
          <p className="text-sm text-muted">Entre para acessar o salão e o caixa.</p>
        </div>
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
        <p className="text-center text-xs text-muted">
          Demo: qualquer usuário @demo.prato.app · senha prato123
        </p>
      </form>
    </div>
  );
}
