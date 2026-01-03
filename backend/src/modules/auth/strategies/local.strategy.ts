import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * ESTRATÉGIA LOCAL - Validação de email + password
 * 
 * Responsabilidade: Validar credenciais locais (email + password)
 * 
 * Fluxo:
 * 1. Cliente envia POST /auth/login { email, password }
 * 2. Passport extrai email e password do body
 * 3. LocalStrategy chama this.validate(email, password)
 * 4. validate() chama AuthService.validateUser()
 * 5. AuthService busca usuário e verifica password
 * 6. Se válido, retorna User object
 * 7. Se inválido, lança exceção 401
 * 
 * Usado em controllers com @UseGuards(AuthGuard('local'))
 * Exemplo: @Post('login') @UseGuards(AuthGuard('local'))
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    // Configurar Passport para procurar 'email' (não 'username')
    super({ 
      usernameField: 'email', // Campo do body que contém o "username"
      passwordField: 'password', // Campo do body que contém a "password"
    });
  }

  /**
   * VALIDAR - Chamado após credenciais serem extraídas do body
   * 
   * Parâmetros:
   * - email: Extraído de req.body.email
   * - password: Extraído de req.body.password
   * 
   * Retorna:
   * - User object se credenciais válidas
   * - Lança exceção se inválidas
   * 
   * Fluxo:
   * 1. Chamar AuthService.validateUser(email, password)
   * 2. Se null, lançar exceção 401
   * 3. Se válido, retornar user
   */
  async validate(email: string, password: string): Promise<any> {
    // Validar credenciais usando AuthService
    const user = await this.authService.validateUser(email, password);

    // Se credenciais inválidas
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Retornar usuário se válido
    return user;
  }
}
