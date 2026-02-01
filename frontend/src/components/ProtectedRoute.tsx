import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { hasAccessToRoute, UserRole } from '@/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: UserRole[];
  fallback?: React.ReactNode;
}

/**
 * Componente para proteger rotas baseado em roles
 * 
 * Uso:
 * <ProtectedRoute requiredRoles={[UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN]}>
 *   <AuditPage />
 * </ProtectedRoute>
 * 
 * Se utilizador não tem o role:
 * - Redireciona para Dashboard
 * - Ou mostra componente fallback se fornecido
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  fallback,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();

  // Não autenticado - redirecionar para login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar se tem acesso
  const hasAccess = hasAccessToRoute(user.roles, requiredRoles);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirecionar para dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
