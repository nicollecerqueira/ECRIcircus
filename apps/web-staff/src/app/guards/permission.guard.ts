import { redirect } from '@tanstack/react-router';
import { hasPermission, hasRole, type Permission } from '../core/auth.service';
import { authGuard } from './auth.guard';

export interface GuardData {
  permissions: Permission[];
  roles?: string[];
}

/**
 * Mirrors Brascon's `protectedData(permissions, roles)`. Produces a TanStack
 * `beforeLoad` that first enforces auth, then the route's permissions/roles.
 */
export function protected_(permissions: Permission[], opts?: { roles?: string[] }) {
  return ({ location }: { location: { pathname: string } }) => {
    authGuard(location.pathname);
    const okPerms = permissions.every((p) => hasPermission(p));
    const okRoles = !opts?.roles || opts.roles.length === 0 || hasRole(...opts.roles);
    if (!okPerms || !okRoles) {
      // Denied → send to the first surface the user can actually see.
      throw redirect({ to: hasPermission('floor') ? '/floor' : '/login' });
    }
  };
}
