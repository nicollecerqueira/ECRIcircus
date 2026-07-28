import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { type DinerRole, Role } from './roles';

export interface JwtClaims {
  sub: string;
  tenantId: string;
  locationId?: string;
  /** Papel de staff OU `diner` (cliente do QR — não é um User). */
  role: Role | DinerRole;
  stationIds?: string[];
  /** Só no token do diner: mesa e sessão que o QR abriu. */
  tableId?: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET') ?? 'dev-access-secret-change-me',
    });
  }

  // Return value is attached to req.user; the TenantInterceptor reads it.
  validate(payload: JwtClaims): JwtClaims {
    return payload;
  }
}
