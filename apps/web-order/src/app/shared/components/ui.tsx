import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  const base =
    variant === 'primary'
      ? 'bg-primary text-primary-fg ring-1 ring-gold/40 hover:opacity-90'
      : 'bg-surface-2 text-fg hover:bg-border';
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${base} ${className}`}
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

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-10 text-muted">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent/15 text-accent',
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
};

export function Badge({ tone = 'neutral', children }: { tone?: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone] ?? BADGE_TONES.neutral}`}
    >
      {children}
    </span>
  );
}

/** Estado vazio/erro consistente: emoji + título + dica opcional. */
export function EmptyState({
  icon,
  title,
  hint,
  children,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-md p-8 text-center">
      {icon && <div className="mb-3 text-5xl">{icon}</div>}
      <p className="circus-title text-lg font-semibold text-fg">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{hint}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

/* ─── Ornamentos de circo ──────────────────────────────────────────────────
   Puramente decorativos: `aria-hidden`, sem texto e sem papel funcional.
   As classes vivem em styles.css. */

/** Faixas da lona — fio fino, para topo/rodapé de uma barra. */
export function TentStripes({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`circus-stripes ${className}`} />;
}

/** Toldo da tenda, com a barra recortada em meia-lua. Peça de destaque: uma
    por tela, no topo — repetido, vira poluição. */
export function Awning({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`circus-awning ${className}`} />;
}

/** Sobrelinha de cartaz acima de um título. */
export function Kicker({ children }: { children: ReactNode }) {
  return <p className="circus-kicker">{children}</p>;
}

/** Bandeirolas penduradas — separa o cabeçalho do conteúdo. */
export function Bunting({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`circus-bunting ${className}`} />;
}

/** Fileira de lâmpadas da marquise. */
export function MarqueeLights({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`circus-marquee ${className}`} />;
}

/** Divisor com estrela dourada no meio — respiro entre seções.
    A margem fica com quem chama: `my-*` embutido aqui colidiria com o que vem
    em `className` (mesma propriedade, ordem indefinida no CSS gerado). */
export function StarDivider({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`circus-divider ${className}`}>
      <span className="text-sm">★</span>
    </div>
  );
}

/** Título de seção no estilo cartaz: ★ NOME ★ */
export function PosterHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="circus-title mb-2 flex items-center gap-2 border-b border-border pb-1 text-sm font-bold uppercase tracking-widest text-accent">
      <span aria-hidden>★</span>
      {children}
    </h2>
  );
}
