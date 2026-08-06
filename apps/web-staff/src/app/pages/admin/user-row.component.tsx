import { useState } from 'react';
import { Badge, Button, IconButton } from '../../shared/components/ui';
import { ASSIGNABLE_ROLES, passwordSchema, roleLabel, type StaffUser } from './users.model';
import { apiErrorMessage, useDeleteStaffUser, useUpdateStaffUser } from './users.service';

/** Ícone base 16px, traço em currentColor — herda a cor do IconButton. */
function Icon({ children }: { children: React.ReactNode }) {
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

const KeyIcon = () => (
  <Icon>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 8.8-8.8" />
    <path d="m17 6 3 3" />
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
 * Uma conta de staff na lista.
 *
 * `isSelf` desliga trocar papel e remover: são as duas ações que trancam o dono
 * para fora do próprio admin, e como só o dono entra aqui, não sobraria ninguém
 * para desfazer. A API recusa as duas de todo jeito — aqui a trava existe para a
 * pessoa não descobrir isso só depois de clicar.
 */
export function UserRow({ user, isSelf }: { user: StaffUser; isSelf: boolean }) {
  const update = useUpdateStaffUser();
  const remove = useDeleteStaffUser();
  const [resetting, setResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const passwordError = password.length > 0 ? passwordSchema.safeParse(password).error : undefined;

  const submitPassword = () => {
    if (passwordSchema.safeParse(password).success !== true) {
      return;
    }
    update.mutate(
      { id: user.id, password },
      {
        onSuccess: () => {
          setPassword('');
          setResetting(false);
        },
      },
    );
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {user.name}
            {isSelf && <Badge tone="accent">você</Badge>}
          </p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="sr-only">Acesso de {user.name}</span>
            <select
              value={user.role}
              disabled={isSelf || update.isPending}
              title={isSelf ? 'Você não pode mudar o próprio acesso' : undefined}
              onChange={(e) => update.mutate({ id: user.id, role: e.target.value })}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary disabled:opacity-60"
            >
              {/* Papel fora da lista (conta antiga) vira opção própria, senão o
                  select mostraria outro papel e uma edição qualquer o trocaria
                  sem ninguém pedir. */}
              {ASSIGNABLE_ROLES.some((r) => r.value === user.role) ? null : (
                <option value={user.role}>{roleLabel(user.role)}</option>
              )}
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>

          <IconButton
            label={`Definir nova senha de ${user.name}`}
            active={resetting}
            onClick={() => {
              setResetting((v) => !v);
              setPassword('');
            }}
          >
            <KeyIcon />
          </IconButton>

          <IconButton
            label={isSelf ? 'Você não pode remover a própria conta' : `Remover ${user.name}`}
            tone="danger"
            disabled={isSelf}
            onClick={() => setConfirmingRemoval(true)}
          >
            <TrashIcon />
          </IconButton>
        </div>
      </div>

      {resetting && (
        <div className="mt-3 rounded-lg border border-accent/40 bg-surface-2 p-3">
          <p className="mb-2 text-xs text-muted">
            A senha é substituída na hora. Não há recuperação por e-mail: quem redefine é você, e
            precisa avisar a pessoa.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={password}
              autoComplete="off"
              placeholder="Nova senha"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitPassword();
                }
              }}
              className="min-w-48 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <Button
              onClick={submitPassword}
              disabled={update.isPending || password.length === 0 || !!passwordError}
            >
              {update.isPending ? 'Salvando…' : 'Salvar senha'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setResetting(false);
                setPassword('');
              }}
            >
              Cancelar
            </Button>
          </div>
          {/* Em texto claro de propósito: o dono precisa LER a senha para passar
              para a pessoa, e mascarar aqui só levaria a erro de digitação. */}
          {passwordError && (
            <p className="mt-2 text-xs text-danger">{passwordError.issues[0].message}</p>
          )}
        </div>
      )}

      {confirmingRemoval && (
        <div className="mt-3 rounded-lg border border-danger/40 bg-danger/5 p-3">
          <p className="text-sm font-medium">
            Remover a conta de {user.name} ({user.email})?
          </p>
          <p className="mt-1 text-xs text-muted">
            Ela perde o acesso imediatamente. Os pedidos que ela lançou continuam onde estão.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmingRemoval(false)}>
              Manter
            </Button>
            <Button
              variant="danger"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(user.id, { onSuccess: () => setConfirmingRemoval(false) })
              }
            >
              {remove.isPending ? 'Removendo…' : 'Sim, remover'}
            </Button>
          </div>
        </div>
      )}

      {update.isError && (
        <p className="mt-2 text-sm text-danger">
          {apiErrorMessage(update.error, 'Não foi possível salvar a alteração.')}
        </p>
      )}
      {remove.isError && (
        <p className="mt-2 text-sm text-danger">
          {apiErrorMessage(remove.error, 'Não foi possível remover a conta.')}
        </p>
      )}
    </li>
  );
}
