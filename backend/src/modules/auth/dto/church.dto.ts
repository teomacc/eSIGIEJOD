import { IsString, MinLength, MaxLength, IsUUID, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO - Criar Igreja
 */
export class CreateChurchDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nome!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @IsUUID()
  pastorLocalId?: string;

  @IsOptional()
  @IsUUID()
  liderFinanceiroLocalId?: string;
}

/**
 * DTO - Atualizar Igreja
 */
export class UpdateChurchDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  nome?: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;

  @IsOptional()
  @IsUUID()
  pastorLocalId?: string;

  @IsOptional()
  @IsUUID()
  liderFinanceiroLocalId?: string;
}

/**
 * DTO - Resposta de Igreja
 */
export class ChurchResponseDto {
  id!: string;
  nome!: string;
  codigo!: string;
  activa!: boolean;
  pastorLocalId?: string;
  liderFinanceiroLocalId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
