import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * ENUM - Níveis de Aprovação
 * 
 * Define os 4 níveis hierárquicos de aprovação
 * 
 * Hierarquia (baixo para alto):
 * TREASURER < DIRECTOR < BOARD < PASTOR
 */
export enum ApprovalLevel {
  TREASURER = 'TREASURER', // Tesoureiro Local - até 5.000 MT
  DIRECTOR = 'DIRECTOR', // Director Financeiro - até 20.000 MT
  BOARD = 'BOARD', // Conselho de Direcção - até 50.000 MT
  PASTOR = 'PASTOR', // Pastor Sénior - sem limite
}

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
  constructor(private configService: ConfigService) {}

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
  calculateApprovalLevel(amount: number): ApprovalLevel {
    // Thresholds de aprovação (valores em Meticais)
    // TODO: Mover para configuração BD
    const treasurerLimit = 5000; // Até 5.000 MT
    const directorLimit = 20000; // Até 20.000 MT
    const boardLimit = 50000; // Até 50.000 MT
    // Sem limite para PASTOR

    // Lógica de determinação de nível
    if (amount <= treasurerLimit) {
      return ApprovalLevel.TREASURER;
    } else if (amount <= directorLimit) {
      return ApprovalLevel.DIRECTOR;
    } else if (amount <= boardLimit) {
      return ApprovalLevel.BOARD;
    } else {
      return ApprovalLevel.PASTOR;
    }
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
    // Mapeamento: para cada nível, quem pode aprovar?
    // Pessoas em roles superiores podem aprovar requisições de níveis inferiores
    const roleHierarchy: { [key in ApprovalLevel]: string[] } = {
      // Para TREASURER level, podem aprovar: TREASURER, DIRECTOR, BOARD, PASTOR
      [ApprovalLevel.TREASURER]: ['TREASURER', 'DIRECTOR', 'BOARD', 'PASTOR'],
      // Para DIRECTOR level, podem aprovar: DIRECTOR, BOARD, PASTOR
      [ApprovalLevel.DIRECTOR]: ['DIRECTOR', 'BOARD', 'PASTOR'],
      // Para BOARD level, podem aprovar: BOARD, PASTOR
      [ApprovalLevel.BOARD]: ['BOARD', 'PASTOR'],
      // Para PASTOR level, podem aprovar: PASTOR
      [ApprovalLevel.PASTOR]: ['PASTOR'],
    };

    // Obter lista de roles autorizados para este nível
    const authorizedRoles = roleHierarchy[requiredLevel] || [];

    // Verificar se usuário tem um dos roles autorizados
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
  canApproveAmount(userRoles: string[], amount: number): boolean {
    // 1. Determinar nível necessário para este montante
    const requiredLevel = this.calculateApprovalLevel(amount);

    // 2. Verificar se usuário tem autoridade para este nível
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
  getAuthorizedRoles(amount: number): string[] {
    // Determinar nível necessário
    const level = this.calculateApprovalLevel(amount);

    // Retornar roles autorizados
    const roleHierarchy: { [key in ApprovalLevel]: string[] } = {
      [ApprovalLevel.TREASURER]: ['TREASURER', 'DIRECTOR', 'BOARD', 'PASTOR'],
      [ApprovalLevel.DIRECTOR]: ['DIRECTOR', 'BOARD', 'PASTOR'],
      [ApprovalLevel.BOARD]: ['BOARD', 'PASTOR'],
      [ApprovalLevel.PASTOR]: ['PASTOR'],
    };

    return roleHierarchy[level] || [];
  }
}
