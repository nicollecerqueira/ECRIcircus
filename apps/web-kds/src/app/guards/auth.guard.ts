import { redirect } from '@tanstack/react-router';
import { canUseKds, isAuthenticated } from '../core/auth.service';

/** Auth + role guard for the KDS (kitchen / manager only). */
export function kdsGuard({ location }: { location: { pathname: string } }) {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login', search: { redirect: location.pathname } });
  }
  if (!canUseKds()) {
    throw redirect({ to: '/login' });
  }
}
