import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * CONTROLADOR DE AUTENTICAÇÃO (AuthController)
 * 
 * Responsabilidade: Gerir endpoints de autenticação
 * 
 * Endpoints:
 * - POST /auth/login - Autenticar usuário
 * - POST /auth/register - Registar novo usuário (TODO)
 * 
 * Fluxo HTTP:
 * 1. Cliente faz POST /auth/login com { email, password }
 * 2. Controller recebe e passa para AuthService
 * 3. AuthService valida e gera JWT
 * 4. Controller retorna { access_token, user }
 * 5. Cliente armazena token no localStorage
 */
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * LOGIN - Endpoint de autenticação
   * 
   * POST /auth/login
   * Body: { email: string, password: string }
   * 
   * Resposta (200 OK):
   * {
   *   "access_token": "eyJhbGciOiJIUzI1NiIs...",
   *   "user": {
   *     "id": "uuid...",
   *     "email": "user@church.com",
   *     "name": "João Silva",
   *     "roles": ["TREASURER"],
   *     "churchId": "uuid..."
   *   }
   * }
   * 
   * Erro (401 Unauthorized):
   * {
   *   "message": "Usuário não encontrado" ou "Password incorrecta"
   * }
   */
  @Post('login')
  async login(
    @Body() credentials: { email: string; password: string }
  ) {
    return this.authService.login(
      credentials.email,
      credentials.password
    );
  }

  /**
   * REGISTAR - Endpoint para registar novo usuário (TODO)
   * 
   * POST /auth/register
   * Body: { email, password, name, churchId }
   * 
   * TODO: Implementar validações:
   * 1. Email único
   * 2. Password forte (mínimo 8 caracteres, uppercase, números)
   * 3. churchId válido
   * 4. Enviar email de confirmação
   * 5. Hashear password com bcrypt
   */
  @Post('register')
  async register(@Body() userData: any) {
    // TODO: Implementar registo de novo usuário
    throw new Error('Registo ainda não implementado');
  }
}
