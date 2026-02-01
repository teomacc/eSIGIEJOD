import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

/**
 * GUARD - Validação de Papel/Role (RoleGuard)
 * 
 * Garante que apenas utilizadores com o papel correto podem acessar um endpoint
 * 
 * Uso:
 * @UseGuards(AuthGuard('jwt'), RoleGuard)
 * @Roles(UserRole.ADMIN, UserRole.LIDER_FINANCEIRO_GERAL)
 * @Get('audit')
 * getAuditLogs() { ... }
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Obter papéis requeridos do decorador @Roles
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    );

    // Se não há decorator @Roles, permitir (usar AuthGuard e ChurchScopeGuard)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user; // Definido pelo AuthGuard (JWT)

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    // Admin tem acesso a tudo
    if (user.roles?.includes(UserRole.ADMIN)) {
      return true;
    }

    // Verificar se algum papel do utilizador está nos papéis requeridos
    const hasRole = user.roles?.some((role: UserRole) =>
      requiredRoles.includes(role)
    );

    if (!hasRole) {
      throw new ForbiddenException(
        `Acesso negado. Papéis necessários: ${requiredRoles.join(', ')}. Seus papéis: ${user.roles?.join(', ') || 'nenhum'}`
      );
    }

    return true;
  }
}

export default RoleGuard;
