/**
 * DTO - Data Transfer Object para Registo
 * 
 * Valida dados recebidos do cliente para registar novo usuário
 * 
 * Restrições:
 * - email: deve ser válido e único
 * - password: mínimo 8 caracteres, 1 maiúscula, 1 número
 * - name: obrigatório
 * - churchId: obrigatório (qual igreja)
 * - roles: array de roles (TREASURER, DIRECTOR, AUDITOR, VIEWER)
 */
export class RegisterDto {
  email!: string;
  password!: string;
  name!: string;
  churchId!: string;
  roles!: string[];
}

/**
 * DTO - Resposta de Registo
 */
export class RegisterResponseDto {
  id!: string;
  email!: string;
  name!: string;
  churchId!: string;
  roles!: string[];
  message!: string;
}
