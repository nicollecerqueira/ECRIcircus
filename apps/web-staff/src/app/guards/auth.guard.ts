import { redirect } from '@tanstack/react-router';
import { isAuthenticated } from '../core/auth.service';

/** Angular CanActivate → TanStack beforeLoad. Redirects to /login when anonymous. */
export function authGuard(pathname: string) {
  if (!isAuthenticated()) {
    throw redirect({ to: '/login', search: { redirect: pathname } });
  }
}
