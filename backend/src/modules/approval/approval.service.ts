import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigurationService } from '../finances/configuration.service';
import { UserRole } from '../auth/entities/user.entity';

/**
 * ENUM - Níveis de Aprovação
 * 
 * Define os 4 níveis hierárquicos de aprovação
 * 
 * Hierarquia (baixo para alto):
 * TREASURER < DIRECTOR < BOARD < PASTOR
 */
export const ApprovalLevel = {
  LOCAL_FINANCE: 'LOCAL_FINANCE', // Líder financeiro local
  LOCAL_PASTOR: 'LOCAL_PASTOR', // Pastor local
  GLOBAL_FINANCE: 'GLOBAL_FINANCE', // Líder financeiro geral
  PRESIDENT: 'PRESIDENT', // Pastor presidente / Admin
} as const;

export type ApprovalLevel = typeof ApprovalLevel[keyof typeof ApprovalLevel];

/**
 * SERVIÇO DE APROVAÇÃO (ApprovalService)
 * 
 * Responsabilidade: Implementar lógica de aprovação automática
 * 
 * Métodos principais:
 * 1. calculateApprovalLevel() - Determina nível de aprovação baseado em montante
 * 2. canApproveAtLevel() - Verifica se usuário tem autoridade para aprovar
 * 3. getApprovalChain() - Retorna cadeia de aprovadores necessários
 * 
 * Fluxo de Cálculo de Nível:
 * 1. Requisição é criada com montante X
 * 2. calculateApprovalLevel(X) retorna ApprovalLevel
 * 3. Sistema sabe quem precisa aprovar
 * 
 * Thresholds Padrão (configuráveis):
 * ≤ 5.000 MT → TREASURER
 * ≤ 20.000 MT → DIRECTOR
 * ≤ 50.000 MT → BOARD
 * > 50.000 MT → PASTOR
 */
@Injectable()
export class ApprovalService {
  constructor(
    private configService: ConfigService,
    private configurationService: ConfigurationService,
  ) {}

  /**
   * CALCULAR NÍVEL DE APROVAÇÃO
   * 
   * Parâmetro:
   * - amount: Montante da requisição
   * 
   * Retorna:
   * - ApprovalLevel necessário para aprovar
   * 
   * Fluxo:
   * 1. Comparar amount com thresholds
   * 2. Retornar nível apropriado
   * 
   * Exemplo:
   * calculateApprovalLevel(15000) → ApprovalLevel.DIRECTOR
   * calculateApprovalLevel(60000) → ApprovalLevel.PASTOR
   * 
   * TODO: Obter thresholds de configuração BD em vez de hardcodeados
   * const treasurerLimit = await configService.get('APPROVAL_TREASURER_LIMIT');
   */
  async calculateApprovalLevel(amount: number, churchId?: string): Promise<ApprovalLevel> {
    const localConfig = churchId
      ? await this.configurationService.getConfiguration(churchId)
      : null;

    const localLimit = localConfig
      ? Number(localConfig.limiteMaxPorRequisicao)
      : Number(this.configService.get<number>('APPROVAL_LOCAL_LIMIT') ?? 50000);

    const lfgLimit = Number(this.configService.get<number>('APPROVAL_LFG_LIMIT') ?? 200000);
    const presidentLimit = this.configService.get<number>('APPROVAL_PRESIDENT_LIMIT');

    if (amount <= localLimit) {
      return ApprovalLevel.LOCAL_FINANCE;
    }

    if (amount <= lfgLimit) {
      return ApprovalLevel.LOCAL_PASTOR;
    }

    if (presidentLimit && amount > presidentLimit) {
      return ApprovalLevel.PRESIDENT;
    }

    return ApprovalLevel.GLOBAL_FINANCE;
  }

  /**
   * PODE APROVAR NO NÍVEL?
   * 
   * Parâmetros:
   * - userRoles: Array de roles do usuário (ex: ['TREASURER', 'AUDITOR'])
   * - requiredLevel: Nível mínimo necessário para aprovar
   * 
   * Retorna:
   * - true se usuário tem autoridade, false caso contrário
   * 
   * Fluxo:
   * 1. Obter hierarquia de roles para o nível requerido
   * 2. Verificar se usuário tem um dos roles autorizados
   * 
   * Exemplo:
   * canApproveAtLevel(['DIRECTOR'], ApprovalLevel.TREASURER) → true
   *   (DIRECTOR pode aprovar requisições de TREASURER)
   * 
   * canApproveAtLevel(['TREASURER'], ApprovalLevel.DIRECTOR) → false
   *   (TREASURER NÃO pode aprovar requisições de DIRECTOR)
   * 
   * Hierarquia:
   * PASTOR pode aprovar tudo
   * BOARD pode aprovar até BOARD level
   * DIRECTOR pode aprovar até DIRECTOR level
   * TREASURER pode aprovar até TREASURER level
   */
  canApproveAtLevel(
    userRoles: string[],
    requiredLevel: ApprovalLevel,
  ): boolean {
    const roleHierarchy: { [key in ApprovalLevel]: string[] } = {
      [ApprovalLevel.LOCAL_FINANCE]: [
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.TREASURER,
        UserRole.DIRECTOR,
        UserRole.PASTOR,
      ],
      [ApprovalLevel.LOCAL_PASTOR]: [
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.PASTOR,
      ],
      [ApprovalLevel.GLOBAL_FINANCE]: [
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.DIRECTOR,
        UserRole.BOARD,
      ],
      [ApprovalLevel.PRESIDENT]: [UserRole.PASTOR_PRESIDENTE, UserRole.ADMIN, UserRole.PASTOR],
    };

    const authorizedRoles = roleHierarchy[requiredLevel] || [];
    return userRoles.some((role) => authorizedRoles.includes(role));
  }

  /**
   * OBTER CADEIA DE APROVAÇÃO
   * 
   * Parâmetro:
   * - amount: Montante da requisição
   * 
   * Retorna:
   * - Array de ApprovalLevel necessários para aprovar
   * 
   * Fluxo:
   * 1. Calcular nível de aprovação
   * 2. Retornar cadeia sequencial
   * 
   * Nota: Sistema atual é sequencial (um aprovador)
   * Se no futuro precisar múltiplos aprovadores, expandir aqui
   * 
   * Exemplo:
   * getApprovalChain(15000) → [ApprovalLevel.DIRECTOR]
   * 
   * TODO: Implementar cadeias múltiplas se necessário
   * Exemplo: Requisição de 60.000 pode precisar DIRECTOR depois PASTOR
   */
  getApprovalChain(amount: number): ApprovalLevel[] {
    // Calcular o nível necessário
    const level = this.calculateApprovalLevel(amount);

    // Mapeamento de nível para cadeia de aprovadores
    // Atualmente cadeia simples (um aprovador)
    const chains: { [key in ApprovalLevel]: ApprovalLevel[] } = {
      [ApprovalLevel.TREASURER]: [ApprovalLevel.TREASURER],
      [ApprovalLevel.DIRECTOR]: [ApprovalLevel.DIRECTOR],
      [ApprovalLevel.BOARD]: [ApprovalLevel.BOARD],
      [ApprovalLevel.PASTOR]: [ApprovalLevel.PASTOR],
    };

    // Retornar cadeia para este nível
    return chains[level] || [];
  }

  /**
   * VALIDAR AUTORIDADE PARA APROVAR
   * 
   * Método auxiliar que combina cálculos acima
   * Retorna true se usuário pode aprovar requisição com este montante
   * 
   * Parâmetros:
   * - userRoles: Roles do usuário
   * - amount: Montante da requisição
   * 
   * Retorna:
   * - true se pode aprovar, false caso contrário
   * 
   * Uso:
   * const canApprove = approvalService.canApproveAmount(req.user.roles, 15000);
   * if (!canApprove) throw new UnauthorizedException();
   */
  async canApproveAmount(
    userRoles: string[],
    amount: number,
    churchId?: string,
  ): Promise<boolean> {
    const requiredLevel = await this.calculateApprovalLevel(amount, churchId);
    return this.canApproveAtLevel(userRoles, requiredLevel);
  }

  /**
   * OBTER APROVADORES POSSÍVEIS
   * 
   * Método auxiliar que retorna lista de roles que podem aprovar um montante
   * 
   * Parâmetro:
   * - amount: Montante da requisição
   * 
   * Retorna:
   * - Array de roles autorizados
   * 
   * Exemplo:
   * getAuthorizedRoles(15000) → ['DIRECTOR', 'BOARD', 'PASTOR']
   * 
   * Uso em frontend:
   * Mostrar ao usuário quem pode aprovar a requisição
   */
  async getAuthorizedRoles(amount: number, churchId?: string): Promise<string[]> {
    const level = await this.calculateApprovalLevel(amount, churchId);

    const roleHierarchy: { [key in ApprovalLevel]: string[] } = {
      [ApprovalLevel.LOCAL_FINANCE]: [
        UserRole.LIDER_FINANCEIRO_LOCAL,
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.TREASURER,
        UserRole.DIRECTOR,
        UserRole.PASTOR,
      ],
      [ApprovalLevel.LOCAL_PASTOR]: [
        UserRole.PASTOR_LOCAL,
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.PASTOR,
      ],
      [ApprovalLevel.GLOBAL_FINANCE]: [
        UserRole.LIDER_FINANCEIRO_GERAL,
        UserRole.PASTOR_PRESIDENTE,
        UserRole.ADMIN,
        UserRole.BOARD,
      ],
      [ApprovalLevel.PRESIDENT]: [UserRole.PASTOR_PRESIDENTE, UserRole.ADMIN, UserRole.PASTOR],
    };

    return roleHierarchy[level] || [];
  }
}
