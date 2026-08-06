import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @MaxLength(160)
  name!: string;

  /** Centavos, nunca float. */
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsString()
  categoryId!: string;

  @IsString()
  stationId!: string;

  @IsOptional()
  @IsBoolean()
  isCombo?: boolean;

  @IsOptional()
  @IsString()
  comboItems?: string;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsString()
  stationId?: string;

  @IsOptional()
  @IsBoolean()
  isCombo?: boolean;

  @IsOptional()
  @IsString()
  comboItems?: string;

  /**
   * Promoção. `null` limpa — por isso ValidateIf em vez de IsOptional puro:
   * precisamos distinguir "não mandou o campo" de "mandou null para remover".
   */
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(0)
  promoPriceCents?: number | null;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  promoStartsAt?: string | null;

  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsDateString()
  promoEndsAt?: string | null;
}

export class CreateCategoryDto {
  @IsString()
  @MaxLength(120)
  name!: string;
}
