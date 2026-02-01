import { Controller, Post, Get, Patch, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { CreateFirstAdminDto } from './dto/create-first-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
    @Body() credentials: { emailOrUsername: string; password: string }
  ) {
    return this.authService.login(
      credentials.emailOrUsername,
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

  /**
   * CRIAR PRIMEIRO ADMIN - Setup Inicial
   * 
   * POST /auth/setup/create-first-admin
   * 
   * Endpoint de setup para criar primeiro admin em produção.
   * Só funciona se a BD estiver vazia (nenhum usuário).
   * 
   * Corpo:
   * {
   *   "nomeCompleto": "Administrador da Igreja",
   *   "email": "admin@igreja.com",
   *   "username": "admin",
   *   "password": "SecurePass123!",
   *   "telefone": "+258 84 123 4567",
   *   "cidade": "Maputo"
   * }
   * 
   * Resposta (201 Created):
   * {
   *   "success": true,
   *   "message": "Admin criado com sucesso!",
   *   "user": { id, email, username, roles, churchId }
   * }
   * 
   * Erros:
   * - 403 Forbidden: Se já existir algum usuário
   * - 409 Conflict: Se email/username já existir
   * - 400 Bad Request: Se dados inválidos
   */
  @Post('setup/create-first-admin')
  async createFirstAdmin(@Body() dto: CreateFirstAdminDto) {
    return this.authService.createFirstAdmin(dto);
  }

  /**
   * LISTAR UTILIZADORES - Para seleção em formulários
   * 
   * GET /auth/users
   * Authorization: Bearer <jwt_token>
   * 
   * Query params:
   * - role?: string (filtrar por role, ex: PASTOR_LOCAL)
   * 
   * Resposta (200 OK):
   * [
   *   {
   *     "id": "uuid...",
   *     "name": "João Silva",
   *     "email": "joao@church.com",
   *     "roles": ["PASTOR_LOCAL"]
   *   },
   *   ...
   * ]
   */
  @Get('users')
  @UseGuards(JwtAuthGuard)
  async listUsers(@Request() req: any) {
    return this.authService.listUsers();
  }

  /**
   * LISTAR TODOS OS UTILIZADORES - Para página de gestão
   * 
   * GET /auth/all-users
   * Authorization: Bearer <jwt_token>
   * 
   * Resposta (200 OK):
   * [
   *   {
   *     "id": "uuid...",
   *     "nomeCompleto": "João Silva",
   *     "email": "joao@church.com",
   *     "username": "joao",
   *     "roles": ["PASTOR_LOCAL"],
   *     "ativo": true,
   *     "churchId": "uuid..."
   *   },
   *   ...
   * ]
   */
  @Get('all-users')
  @UseGuards(JwtAuthGuard)
  async listAllUsers() {
    return this.authService.listAllUsers();
  }

  /**
   * ACTUALIZAR STATUS UTILIZADOR - Desactivar/Activar
   * 
   * PATCH /auth/:id
   * Authorization: Bearer <jwt_token>
   * 
   * Body:
   * {
   *   "ativo": false
   * }
   * 
   * Resposta (200 OK):
   * {
   *   "id": "uuid...",
   *   "nomeCompleto": "João Silva",
   *   "email": "joao@church.com",
   *   "ativo": false
   * }
   */
  @Patch('users/:id')
  @UseGuards(JwtAuthGuard)
  async updateUser(
    @Param('id') userId: string,
    @Body() updateData: { ativo?: boolean },
  ) {
    return this.authService.updateUser(userId, updateData);
  }

  /**
   * PERFIL - Obter dados do usuário autenticado
   * GET /auth/profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  /**
   * PERFIL - Actualizar dados do usuário autenticado
   * PATCH /auth/profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, dto);
  }

  /**
   * ALTERAR SENHA - Validar senha atual e atualizar
   * POST /auth/change-password
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto);
  }
}

