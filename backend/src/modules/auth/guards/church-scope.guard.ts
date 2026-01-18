import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class ChurchScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { roles?: string[]; churchId?: string } | undefined;

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    const roles = user.roles || [];
    const isGlobal = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) || roles.includes(UserRole.PASTOR_PRESIDENTE);

    if (isGlobal) {
      return true;
    }

    if (!user.churchId) {
      throw new ForbiddenException('Utilizador sem igreja associada para escopo local');
    }

    // Disponibiliza churchId para handlers/serviços se precisarem
    request.churchId = user.churchId;
    return true;
  }
}
