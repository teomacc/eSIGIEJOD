import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

/**
 * DECORADOR - @Roles
 * 
 * Define quais papéis têm acesso a um endpoint
 * 
 * Uso com RoleGuard:
 * @UseGuards(AuthGuard('jwt'), RoleGuard)
 * @Roles(UserRole.ADMIN, UserRole.LIDER_FINANCEIRO_GERAL)
 * @Get('audit')
 * getAuditLogs() { ... }
 * 
 * Notas:
 * - Requer que RoleGuard esteja aplicado na classe ou método
 * - Admin sempre tem acesso, mesmo se não está na lista
 * - Se não especificar @Roles, qualquer utilizador autenticado pode acessar
 */
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);

export default Roles;
