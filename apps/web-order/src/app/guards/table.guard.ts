import { redirect } from '@tanstack/react-router';
import { useSession } from '../core/session.store';

/**
 * Public app — no auth guard. `table.guard` only checks that a diner has a valid
 * table token (from scanning the QR); if not, send them to a "scan the QR" screen.
 */
export function tableTokenGuard() {
  if (!useSession.getState().dinerToken) {
    throw redirect({ to: '/scan' });
  }
}
