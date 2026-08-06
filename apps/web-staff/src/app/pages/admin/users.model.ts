import { z } from 'zod';

export const staffUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  createdAt: z.string(),
});
export type StaffUser = z.infer<typeof staffUserSchema>;

/**
 * Papéis que o dono pode atribuir — espelha `ASSIGNABLE_ROLES` da API. A ordem é
 * do mais amplo para o mais restrito, para a lista se ler como uma escada de
 * acesso; e cada um traz o que ele ALCANÇA, porque "cashier" não diz nada a quem
 * está montando a equipe do evento.
 */
export const ASSIGNABLE_ROLES = [
  { value: 'brand_owner', label: 'Dono', access: 'Tudo, inclusive estas contas' },
  { value: 'location_manager', label: 'Gerente', access: 'Salão, caixa e cardápio' },
  { value: 'cashier', label: 'Caixa', access: 'Salão e pagamentos' },
  { value: 'waiter', label: 'Balcão', access: 'Salão e pedidos' },
  { value: 'kitchen', label: 'Cozinha', access: 'Só o painel da cozinha (KDS)' },
] as const;

const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ASSIGNABLE_ROLES.map((r) => [r.value, r.label]),
);

/** Nunca devolve vazio: papel desconhecido (vindo de um seed antigo) aparece
    como está, em vez de sumir e fazer a linha parecer sem papel. */
export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

const PASSWORD_MIN = 6;

export const newUserFormSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome'),
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres`),
  role: z.string().min(1, 'Escolha o acesso'),
});
export type NewUserForm = z.infer<typeof newUserFormSchema>;

export const passwordSchema = z.string().min(PASSWORD_MIN, `Mínimo ${PASSWORD_MIN} caracteres`);
