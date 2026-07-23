import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { type TenantContext, tenantStorage } from './tenant-context';

interface RequestUser {
  tenantId: string;
  locationId?: string;
  sub?: string;
  role?: string;
  stationIds?: string[];
}

/**
 * Isolation layer 1: resolve the tenant from the authenticated principal (JWT or
 * QR session token, both put on req.user by their guard/strategy) and run the rest
 * of the request inside an AsyncLocalStorage scope. Public routes run with no scope.
 *
 * In the backend phase this is also where `SET app.tenant_id` (RLS GUC) is issued.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = req.user;
    if (!user?.tenantId) {
      return next.handle();
    }
    const ctx: TenantContext = {
      tenantId: user.tenantId,
      locationId: user.locationId,
      userId: user.sub,
      role: user.role,
      stationIds: user.stationIds,
    };
    return tenantStorage.run(ctx, () => next.handle());
  }
}
