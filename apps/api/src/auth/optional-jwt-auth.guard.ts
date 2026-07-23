import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Autenticação OPCIONAL, para rotas que servem staff e diner anônimo pela mesma
 * URL (o cardápio é o caso: o garçom lê com JWT, o cliente do QR lê sem nada).
 *
 * Uma rota `@Public()` comum nem executa a estratégia JWT, então `req.user` fica
 * vazio mesmo quando o token veio — e o contexto de tenant nunca é montado. Este
 * guard roda a estratégia, mas não derruba a requisição quando não há token:
 * segue anônima, e aí cabe à rota exigir o escopo explícito.
 *
 * Token inválido também segue como anônimo — o efeito prático é o mesmo de não
 * ter token, e quem decide o que fazer sem escopo é a rota.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(_err: unknown, user: TUser | false): TUser | undefined {
    return user || undefined;
  }
}
