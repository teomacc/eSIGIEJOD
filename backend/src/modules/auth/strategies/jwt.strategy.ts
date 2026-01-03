import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * ESTRATÉGIA JWT - Validação de JWT tokens
 * 
 * Responsabilidade: Validar JWT tokens em requisições protegidas
 * 
 * Fluxo:
 * 1. Cliente envia requisição com header: Authorization: Bearer <token>
 * 2. Passport extrai token do header
 * 3. JwtStrategy valida assinatura usando JWT_SECRET
 * 4. Se válido, extrai payload (userId, email, roles, churchId)
 * 5. Injeta dados no @Req() req.user
 * 6. Controller pode acessar: req.user.userId, req.user.roles, etc.
 * 
 * Usado em controllers com @UseGuards(AuthGuard('jwt'))
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    // Configurar Passport para extrair JWT do header Authorization
    super({
      // Extrair token do header: Authorization: Bearer <token>
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Não ignorar expiração (token expirado é rejeitado)
      ignoreExpiration: false,
      // Chave secreta para validar assinatura
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  /**
   * VALIDAR - Chamado após JWT ser validado
   * 
   * Parâmetro:
   * - payload: Conteúdo decodificado do JWT
   *   {
   *     sub: "user-id",
   *     email: "user@church.com",
   *     roles: ["TREASURER"],
   *     churchId: "church-id",
   *     iat: timestamp,
   *     exp: timestamp
   *   }
   * 
   * Retorna:
   * - Objeto que será colocado em req.user
   * 
   * Este objeto estará disponível em:
   * @Req() req: any
   * req.user.userId = payload.sub
   * req.user.email = payload.email
   * req.user.roles = payload.roles
   * req.user.churchId = payload.churchId
   */
  async validate(payload: any) {
    // Retornar objeto que será req.user
    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      churchId: payload.churchId,
    };
  }
}
