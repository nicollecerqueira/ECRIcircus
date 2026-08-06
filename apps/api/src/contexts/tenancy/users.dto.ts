import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../auth/roles';

/**
 * Papéis que o dono pode ATRIBUIR.
 *
 * `platform_admin` fica de fora de propósito: é papel da plataforma, não da
 * operação do evento — quem administra o circo não deve conseguir criar alguém
 * acima de si. A lista é a fonte da verdade tanto da validação quanto da tela.
 */
export const ASSIGNABLE_ROLES: string[] = [
  Role.BrandOwner,
  Role.LocationManager,
  Role.Waiter,
  Role.Cashier,
  Role.Kitchen,
];

/** bcrypt só considera os primeiros 72 bytes; barrar antes evita a senha que
    "funciona" truncada e confunde quem a cadastrou. O mínimo de 6 é o mesmo do
    login — senha aceita aqui e recusada lá seria conta nascida morta. */
const PASSWORD_MIN = 6;
const PASSWORD_MAX = 72;

export class CreateUserDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(160)
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password!: string;

  @IsIn(ASSIGNABLE_ROLES)
  role!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: string;

  /** Ausente = mantém a senha atual. Presente = troca (não há "esqueci a senha":
      quem redefine é o dono, por aqui). */
  @IsOptional()
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  password?: string;
}
