import { Outlet } from '@tanstack/react-router';
import { Art } from './shared/components/art';
import { Awning, Bunting, TentStripes } from './shared/components/ui';

/** Minimal public chrome. web-order stays a plain, fast, install-free page. */
export function AppComponent() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-surface">
        <Awning />
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <span className="circus-wordmark text-lg font-bold">
            <span aria-hidden className="mr-1">
              🎪
            </span>
            <span>ECRI Circus</span>
          </span>
          <span className="circus-kicker hidden sm:inline">Picadeiro &amp; Cozinha</span>
        </div>
      </header>

      <Bunting />

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-10">
        <TentStripes />
        {/* Pipoca como marca d'água: bem apagada e atrás do texto, senão o
            rodapé passa a competir com o conteúdo da página. */}
        <div className="relative overflow-hidden">
          <Art
            name="popcornLoose"
            size="lg"
            className="pointer-events-none absolute -right-3 -top-4 opacity-30"
          />
          <p className="relative px-4 py-5 text-center text-xs text-muted">
            <span aria-hidden className="text-gold">
              ★
            </span>{' '}
            {/* "Retire no balcão" era do desenho antigo. A operação entrega na
                sala — é por isso que o app pede a sala no fechamento. */}
            ECRI Circus — peça, receba na sua sala e aproveite o espetáculo{' '}
            <span aria-hidden className="text-gold">
              ★
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
