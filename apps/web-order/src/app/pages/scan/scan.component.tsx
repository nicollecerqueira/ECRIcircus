import { Card } from '../../shared/components/ui';

/** Shown when a diner reaches a table-scoped route without a valid table token. */
export function ScanComponent() {
  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mb-4 text-5xl">📷</div>
      <h1 className="mb-2 text-xl font-bold">Escaneie o QR da mesa</h1>
      <Card>
        <p className="text-muted">
          Aponte a câmera para o QR code na sua mesa para abrir o cardápio e fazer o pedido.
        </p>
      </Card>
    </div>
  );
}
