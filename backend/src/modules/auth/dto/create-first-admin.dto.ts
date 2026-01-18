import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO - Criar Primeiro Admin (Setup Inicial em Produção)
 * 
 * Usado APENAS quando não existem usuários no sistema.
 * Endpoint de uso único para setup inicial em produção.
 * 
 * Validações:
 * - Email deve ser válido
 * - Username mínimo 3 caracteres
 * - Password mínimo 8 caracteres, 1 maiúscula, 1 número
 */
export class CreateFirstAdminDto {
  @IsString()
  @MinLength(2)
  nomeCompleto!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password deve ter mínimo 8 caracteres, 1 maiúscula e 1 número',
  })
  password!: string;

  @IsString()
  @MinLength(5)
  telefone?: string;

  @IsString()
  cidade?: string;
}
