import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../contexts/tenancy/domain/user.entity';
import { JwtClaims } from './jwt.strategy';
import { Role } from './roles';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: string; tenantId: string };
}

// Converte um TTL tipo "15m" / "7d" / "3600" em segundos.
const UNIT_SECONDS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
function ttlToSeconds(ttl: string | undefined, fallback: number): number {
  if (!ttl) {
    return fallback;
  }
  const match = /^(\d+)([smhd])?$/.exec(ttl.trim());
  if (!match) {
    return fallback;
  }
  return Number(match[1]) * (UNIT_SECONDS[match[2] ?? 's'] ?? 1);
}

@Injectable()
export class AuthService {
  constructor(
    private readonly em: EntityManager,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Autenticar é, por natureza, anterior ao tenant: só depois de achar o usuário
   * é que se sabe a que marca ele pertence. Por isso — e SÓ aqui e no refresh —
   * o filtro global é desligado explicitamente. Fora destes dois pontos, uma
   * consulta sem contexto de tenant não devolve nada (ver tenant.filter.ts).
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.em.findOne(
      User,
      { email: email.trim().toLowerCase() },
      { filters: { tenant: false }, populate: ['tenant', 'location'] },
    );
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.issue(user);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    try {
      const claims = await this.jwt.verifyAsync<JwtClaims>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.em.findOne(
        User,
        { id: claims.sub },
        { filters: { tenant: false }, populate: ['tenant', 'location'] },
      );
      if (!user) {
        throw new UnauthorizedException();
      }
      return this.issue(user);
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  private issue(user: User): AuthResult {
    const claims: JwtClaims = {
      sub: user.id,
      tenantId: user.tenant.id,
      locationId: user.location?.id,
      role: user.role as Role,
    };
    const accessToken = this.jwt.sign(claims, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: ttlToSeconds(this.config.get<string>('JWT_ACCESS_TTL'), 15 * 60),
    });
    const refreshToken = this.jwt.sign(claims, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: ttlToSeconds(this.config.get<string>('JWT_REFRESH_TTL'), 7 * 24 * 3600),
    });
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenant.id,
      },
    };
  }
}
