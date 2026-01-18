import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../entities/user.entity';

/**
 * GUARD - Restrição para OBREIROs
 * 
 * Impede que usuários com role OBREIRO acessem endpoints sensíveis
 * 
 * Endpoints restritos:
 * - Dashboard financeiro
 * - Despesas
 * - Relatórios financeiros
 * - Dados sensíveis
 * 
 * OBREIROs PODEM acessar:
 * - Criar requisições
 * - Ver suas próprias requisições
 * - Ver suas próprias despesas
 */
@Injectable()
export class ObreiroRestrictionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as any;

    // Se o usuário é OBREIRO, não tem acesso a dados sensíveis
    if (user && user.roles && user.roles.includes(UserRole.OBREIRO)) {
      // Whitelist de rotas permitidas para OBREIRO
      const allowedRoutes = [
        /^\/requisitions\/?$/,           // GET, POST /requisitions
        /^\/requisitions\/[^/]+\/?$/,    // GET /requisitions/:id
        /^\/expenses\/?$/,               // GET /expenses (apenas as dele)
        /^\/expenses\/[^/]+\/?$/,        // GET /expenses/:id (apenas as dele)
      ];

      const path = request.path;
      const method = request.method;

      // GET nas rotas permitidas é OK
      if (method === 'GET') {
        const isAllowed = allowedRoutes.some(route => route.test(path));
        if (!isAllowed) {
          throw new ForbiddenException(
            'OBREIROs não têm acesso a este recurso. Acesso limitado a: requisições, despesas pessoais'
          );
        }
      } else {
        // POST apenas em requisitions
        if (!/^\/requisitions\/?$/.test(path)) {
          throw new ForbiddenException(
            'OBREIROs apenas podem criar requisições'
          );
        }
      }
    }

    return true;
  }
}
