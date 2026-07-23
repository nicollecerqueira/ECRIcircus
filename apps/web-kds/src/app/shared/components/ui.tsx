import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Button({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-base font-semibold text-primary-fg transition hover:opacity-90 disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-12 text-muted">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="min-h-full p-4 sm:p-6">{children}</div>;
}
