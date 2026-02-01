/**
 * UTILITÁRIOS PARA QUERIES COM ISOLAMENTO POR IGREJA
 * 
 * Todos os queries de dados devem respeitar o churchId do utilizador
 * para garantir isolamento de dados entre igrejas
 */

import { useAuth } from '@/context/AuthContext';
import { UserRole } from './permissions';

/**
 * Hook para obter parâmetros de query filtrados por igreja
 * 
 * Comportamento:
 * - Se usuário é LIDER_FINANCEIRO_GERAL ou ADMIN: não filtra (vê todas as igrejas)
 * - Caso contrário: filtra apenas pela churchId do utilizador
 */
export function useChurchFilter() {
  const { user } = useAuth();

  // Admin e Líder Geral veem todas as igrejas (mas Líder Geral tem churchId próprio!)
  if (
    user?.roles.includes(UserRole.ADMIN)
  ) {
    return {
      churchId: undefined, // Sem filtro - vê TODAS as igrejas
      canViewAllChurches: true,
    };
  }

  // Líder Financeiro Geral VÊ todas, mas mantém sua churchId para contexto
  if (user?.roles.includes(UserRole.LIDER_FINANCEIRO_GERAL)) {
    return {
      churchId: user?.churchId, // Mantém sua própria igreja
      canViewAllChurches: true, // Mas pode ver todas
    };
  }

  // Outros veem apenas sua igreja
  return {
    churchId: user?.churchId,
    canViewAllChurches: false,
  };
}

/**
 * Hook para verificar se pode editar/deletar um registro
 * 
 * Regra:
 * - Admin sempre pode
 * - Líder Financeiro Geral sempre pode
 * - Outros apenas se o registro é da sua igreja
 */
export function useCanEdit(recordChurchId?: string): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // Admin e Líder Geral podem editar tudo
  if (
    user.roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) ||
    user.roles.includes(UserRole.ADMIN)
  ) {
    return true;
  }

  // Outros podem editar apenas da sua igreja
  return recordChurchId === user.churchId;
}

/**
 * Hook para verificar se pode visualizar um registro
 */
export function useCanView(recordChurchId?: string): boolean {
  const { user } = useAuth();

  if (!user) return false;

  // Admin e Líder Geral podem ver tudo
  if (
    user.roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) ||
    user.roles.includes(UserRole.ADMIN)
  ) {
    return true;
  }

  // Outros podem ver apenas da sua igreja
  return recordChurchId === user.churchId;
}

/**
 * Construir URL de API com parâmetro de filtro de igreja
 * 
 * Exemplo:
 * const url = buildApiUrl('/api/requisitions', churchFilter);
 * // Retorna: '/api/requisitions?churchId=...' ou '/api/requisitions'
 */
export function buildApiUrl(
  baseUrl: string,
  { churchId, canViewAllChurches }: ReturnType<typeof useChurchFilter>
): string {
  if (canViewAllChurches || !churchId) {
    return baseUrl;
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}churchId=${churchId}`;
}
