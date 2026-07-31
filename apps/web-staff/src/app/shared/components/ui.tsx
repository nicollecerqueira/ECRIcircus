import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Small set of dumb, reusable components (Angular "shared"). Semantic tokens only. */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
};

const VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-primary-fg hover:opacity-90',
  ghost: 'bg-surface-2 text-fg hover:bg-border',
  danger: 'bg-danger text-white hover:opacity-90',
  success: 'bg-success text-white hover:opacity-90',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Texto do tooltip e do aria-label — obrigatório: o botão não tem rótulo visível. */
  label: string;
  tone?: 'default' | 'danger';
  /** Estado "ligado" (ex.: painel aberto, promoção ativa) — realça em accent. */
  active?: boolean;
};

/**
 * Botão só-ícone para as ações de linha. Neutro por padrão para não competir com
 * o conteúdo; a cor só aparece no hover (ou quando `active`/`danger`).
 */
export function IconButton({
  label,
  tone = 'default',
  active = false,
  className = '',
  ...props
}: IconButtonProps) {
  const toneCls =
    tone === 'danger'
      ? 'text-muted hover:bg-danger/10 hover:text-danger'
      : active
        ? 'bg-accent/15 text-accent'
        : 'text-muted hover:bg-surface-2 hover:text-fg';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-50 ${toneCls} ${className}`}
      {...props}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`circus-card rounded-xl border border-border bg-surface p-4 ${className}`}>
      {children}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone] ?? BADGE_TONES.neutral}`}
    >
      {children}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}
