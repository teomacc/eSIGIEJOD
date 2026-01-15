import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

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
   * REGISTAR - Endpoint para registar novo usuário
   * 
   * POST /auth/register
   * Authorization: Bearer <jwt_token>
   * 
   * Body: {
   *   "email": "newtreasurier@church.com",
   *   "password": "SecurePass123",
   *   "name": "João Silva",
   *   "churchId": "uuid-da-igreja",
   *   "roles": ["TREASURER"]
   * }
   * 
   * Resposta (201 Created):
   * {
   *   "id": "uuid...",
   *   "email": "newtreasurier@church.com",
   *   "name": "João Silva",
   *   "churchId": "uuid...",
   *   "roles": ["TREASURER"],
   *   "message": "Usuário registado com sucesso"
   * }
   * 
   * Erros possíveis:
   * - 401 Unauthorized: Sem token JWT
   * - 403 Forbidden: Usuário não é DIRECTOR/TREASURER
   * - 403 Forbidden: Tentando registar em outra igreja
   * - 409 Conflict: Email já existe
   * - 400 Bad Request: Password fraca
   * 
   * Restrições de segurança:
   * 1. Apenas DIRECTOR e TREASURER podem usar este endpoint
   * 2. Só podem registar usuários da sua própria igreja
   * 3. Email deve ser único
   * 4. Password deve ser forte (8+ caracteres, 1 maiúscula, 1 número)
   */
  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: any,
  ) {
    return this.authService.register(registerDto, req.user);
  }
}
