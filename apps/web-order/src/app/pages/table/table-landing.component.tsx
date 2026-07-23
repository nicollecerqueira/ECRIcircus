import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { Spinner } from '../../shared/components/ui';
import { useResolveQr } from '../order/order.service';

/** Diner scanned a table QR (`/t/$qrToken`) → open the session, go to the menu. */
export function TableLandingComponent() {
  const { qrToken } = useParams({ from: '/t/$qrToken' });
  const navigate = useNavigate();
  const resolveQr = useResolveQr();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    resolveQr.mutate(qrToken, {
      onSuccess: () => navigate({ to: '/menu' }),
    });
  }, [qrToken, navigate, resolveQr]);

  if (resolveQr.isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-danger">QR inválido ou mesa indisponível.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-2">
      <Spinner />
      <p className="text-muted">Abrindo sua mesa…</p>
    </div>
  );
}
