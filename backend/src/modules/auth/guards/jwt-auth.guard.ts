import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT AUTH GUARD
 * 
 * Guard para proteger rotas que requerem autenticação JWT
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtected() { ... }
 * 
 * Funciona com JwtStrategy para validar tokens
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
