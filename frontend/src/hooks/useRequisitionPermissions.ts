/**
 * HOOKS PARA REQUISIÇÕES - useRequisitionPermissions
 * 
 * Determina quais ações um usuário pode realizar em uma requisição
 * baseado em:
 * - Role do usuário
 * - Estado da requisição
 * - Tipo de criador da requisição
 */

import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/utils/permissions';

export interface RequisitionPermissions {
  canApprove: boolean;
  canReject: boolean;
  canExecute: boolean;
  canView: boolean;
  isGlobal: boolean;
}

interface RequisitionData {
  id: string;
  state: string;
  creatorType?: string;
  churchId?: string;
  requestedBy?: string;
}

export function useRequisitionPermissions(req: RequisitionData): RequisitionPermissions {
  const { user, hasRole } = useAuth();

  if (!user) {
    return {
      canApprove: false,
      canReject: false,
      canExecute: false,
      canView: false,
      isGlobal: false,
    };
  }

  // Não permitir auto-aprovação: o criador nunca pode aprovar a sua própria requisição
  const isOwnRequisition = req.requestedBy === user.id;

  const isGlobal = hasRole(UserRole.ADMIN) || 
                   hasRole(UserRole.LIDER_FINANCEIRO_GERAL) || 
                   hasRole(UserRole.PASTOR_PRESIDENTE);

  const isMyChurch = req.churchId === user.churchId;

  // IMPORTANTE: Obreiros veem APENAS suas próprias requisições
  // Líderes e globais veem requisições da sua iglesia/globais
  const isObreiro = hasRole(UserRole.OBREIRO) && !hasRole(UserRole.LIDER_FINANCEIRO_LOCAL) && 
                    !hasRole(UserRole.LIDER_FINANCEIRO_GERAL) && !hasRole(UserRole.PASTOR_LOCAL) &&
                    !hasRole(UserRole.PASTOR_PRESIDENTE) && !hasRole(UserRole.ADMIN);

  let canView = false;
  if (isGlobal) {
    // Global pode ver tudo
    canView = true;
  } else if (isObreiro) {
    // Obreiro vê APENAS suas próprias requisições
    canView = isOwnRequisition;
  } else {
    // Líderes locais veem requisições de sua igreja
    canView = isMyChurch;
  }

  // Verificar estado
  const isUnderReview = req.state === 'EM_ANALISE';
  const isApproved = req.state === 'APROVADA';

  // Lógica de aprovação baseada em creatorType
  let canApprove = false;
  let canReject = false;
  let canExecute = false;

  // CRÍTICO: Bloqueie auto-aprovação - criador nunca pode aprovar sua própria requisição
  if (isOwnRequisition) {
    canApprove = false;
    canReject = false;
  } else if (isUnderReview && canView) {
    // OBREIRO: Apenas Líder Financeiro Local aprova
    if (req.creatorType === 'OBREIRO') {
      canApprove = hasRole(UserRole.LIDER_FINANCEIRO_LOCAL) && isMyChurch;
      canReject = hasRole(UserRole.LIDER_FINANCEIRO_LOCAL) && isMyChurch;
    }

    // LÍDER FINANCEIRO LOCAL: Requer Pastor Local + Líder Financeiro Geral
    if (req.creatorType === 'LIDER_FINANCEIRO') {
      canApprove = (hasRole(UserRole.PASTOR_LOCAL) && isMyChurch) || 
                   hasRole(UserRole.LIDER_FINANCEIRO_GERAL);
      canReject = canApprove;
    }

    // PASTOR: Requer Líder Financeiro Local + Líder Financeiro Geral
    if (req.creatorType === 'PASTOR') {
      canApprove = (hasRole(UserRole.LIDER_FINANCEIRO_LOCAL) && isMyChurch) || 
                   hasRole(UserRole.LIDER_FINANCEIRO_GERAL);
      canReject = canApprove;
    }

    // DIRECTOR: Requer Líder Financeiro Geral
    if (req.creatorType === 'DIRECTOR') {
      canApprove = hasRole(UserRole.LIDER_FINANCEIRO_GERAL);
      canReject = canApprove;
    }

    // Admin pode aprovar/rejeitar qualquer uma
    if (hasRole(UserRole.ADMIN)) {
      canApprove = true;
      canReject = true;
    }
  }

  // Execução: Apenas Líder Financeiro Local da igreja ou Líder Financeiro Geral
  if (isApproved && canView) {
    canExecute = (hasRole(UserRole.LIDER_FINANCEIRO_LOCAL) && isMyChurch) || 
                 hasRole(UserRole.LIDER_FINANCEIRO_GERAL) ||
                 hasRole(UserRole.ADMIN);
  }

  return {
    canApprove,
    canReject,
    canExecute,
    canView,
    isGlobal,
  };
}

/**
 * Hook para verificar se usuário pode criar requisição
 */
export function useCanCreateRequisition(): boolean {
  const { user } = useAuth();
  // Qualquer usuário com churchId pode criar requisição
  return !!user?.churchId;
}

/**
 * Obter label amigável do estado
 */
export function getRequisitionStateLabel(state: string): string {
  const labels: Record<string, string> = {
    PENDENTE: 'Pendente',
    EM_ANALISE: 'Em Análise',
    APROVADA: 'Aprovada',
    REJEITADA: 'Rejeitada',
    EXECUTADA: 'Executada',
    CANCELADA: 'Cancelada',
  };
  return labels[state] || state;
}

/**
 * Obter label amigável do criador
 */
export function getCreatorTypeLabel(creatorType?: string): string {
  const labels: Record<string, string> = {
    OBREIRO: 'Obreiro',
    LIDER_FINANCEIRO: 'Líder Financeiro',
    PASTOR: 'Pastor',
    DIRECTOR: 'Director',
  };
  return creatorType ? (labels[creatorType] || creatorType) : 'Não especificado';
}
