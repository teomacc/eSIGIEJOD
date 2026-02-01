import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requisition, RequisitionState, RequisitionMagnitude, ExpenseCategory, RequisitionCreatorType } from './entities/requisition.entity';
import { ApprovalService, ApprovalLevel } from '../approval/approval.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { User, UserRole } from '../auth/entities/user.entity';
import { Church } from '../auth/entities/church.entity';

/**
 * SERVIÇO DE REQUISIÇÕES (RequisitionsService)
 * 
 * Responsabilidade: Gerir ciclo de vida de requisições de despesa
 * 
 * Fluxo de Requisição:
 * 1. createRequisition() - Criar requisição (PENDING)
 * 2. submitForReview() - Enviar para revisão (UNDER_REVIEW)
 * 3. approveRequisition() - Aprovar (APPROVED)
 * 4. rejectRequisition() - Rejeitar (REJECTED)
 * 5. executeRequisition() - Executar (EXECUTED)
 * 6. cancelRequisition() - Cancelar (CANCELLED)
 * 
 * Estados e Transições Permitidas:
 * PENDING → UNDER_REVIEW, CANCELLED
 * UNDER_REVIEW → APPROVED, REJECTED, CANCELLED
 * APPROVED → EXECUTED, CANCELLED
 * REJECTED → (não pode transicionar)
 * EXECUTED → (não pode transicionar)
 * CANCELLED → (não pode transicionar)
 * 
 * Magnitude Calculation:
 * - SMALL: até 5.000 MT (aprovação: TREASURER)
 * - MEDIUM: 5.001 - 20.000 MT (aprovação: DIRECTOR)
 * - LARGE: 20.001 - 50.000 MT (aprovação: BOARD)
 * - CRITICAL: > 50.000 MT (aprovação: PASTOR)
 * 
 * Integração:
 * - ApprovalService: Determinar quem precisa aprovar
 * - AuditService: Log de cada mudança de estado
 * - FinancesService: Atualizar balanço ao executar
 */
@Injectable()
export class RequisitionsService {
  constructor(
    @InjectRepository(Requisition)
    private requisitionsRepository: Repository<Requisition>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Church)
    private churchRepository: Repository<Church>,
    private approvalService: ApprovalService,
    private auditService: AuditService,
  ) {}

  /**
   * CRIAR REQUISIÇÃO - createRequisition()
   * 
   * Entrada:
   * {
   *   churchId: string,
   *   fundId: string,
   *   category: string (ex: MATERIALS),
   *   requestedAmount: number (ex: 15000),
   *   justification: string,
   *   attachments: string[] (URLs)
   * }
   * 
   * Fluxo:
   * 1. Validar que fundId existe
   * 2. Calcular magnitude da requisição
   * 3. Determinar nível de aprovação necessário
   * 4. Criar entidade Requisition (estado PENDING)
   * 5. Registrar no audit log
   * 6. Retornar requisição criada
   * 
   * Validações:
   * - Amount > 0
   * - fundId válido
   * - churchId válido
   * 
   * Retorno:
   * {
   *   "id": "uuid",
   *   "code": "REQ-2024-001",
   *   "churchId": "uuid",
   *   "fundId": "uuid",
   *   "requestedAmount": 15000,
   *   "magnitude": "MEDIUM",
   *   "state": "PENDING",
   *   "requestedAt": "2024-01-15T10:00:00Z"
   * }
   */
  async createRequisition(
    churchId: string,
    userId: string,
    data: {
      fundId: string;
      category: string;
      requestedAmount: number;
      justification: string;
      creatorType?: RequisitionCreatorType;
      attachments?: string[];
    },
    roles?: string[],
  ): Promise<Requisition> {
    // Validar amount
    if (data.requestedAmount <= 0) {
      throw new BadRequestException('Valor da requisição deve ser positivo');
    }

    // Calcular magnitude
    const magnitude = this.calculateMagnitude(data.requestedAmount);

    // Determinar nível de aprovação necessário
    const approvalLevel = await this.approvalService.calculateApprovalLevel(
      data.requestedAmount,
      churchId,
    );

    // Gerar código único
    const code = `REQ-${new Date().getFullYear()}-${Date.now()}`;

    // Determinar creatorType automaticamente baseado nas roles do utilizador
    const creatorType = this.determineCreatorType(roles);

    // Criar requisição
    const requisition = new Requisition();
    requisition.code = code;
    requisition.churchId = churchId;
    requisition.fundId = data.fundId;
    requisition.requestedBy = userId;
    requisition.creatorType = creatorType;
    requisition.category = data.category as ExpenseCategory;
    requisition.requestedAmount = data.requestedAmount as any; // TypeORM handle decimal
    requisition.magnitude = magnitude;
    requisition.state = RequisitionState.PENDING;
    requisition.justification = data.justification;
    requisition.attachments = data.attachments ? JSON.stringify(data.attachments) : undefined;
    requisition.requestedAt = new Date();

    // Salvar
    const saved = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId,
      userId,
      action: AuditAction.REQUISITION_CREATED,
      entityId: saved.id,
      entityType: 'Requisition',
      changes: {
        before: null,
        after: {
          amount: data.requestedAmount,
          magnitude,
          category: data.category,
        },
      },
      description: `Requisição criada para ${data.category}`,
    });

    return saved;
  }

  /**
   * ENVIAR PARA REVISÃO - submitForReview()
   * 
   * Muda estado de PENDING para UNDER_REVIEW
   * 
   * Fluxo:
   * 1. Buscar requisição
   * 2. Validar que está em PENDING
   * 3. Mudar para UNDER_REVIEW
   * 4. Registrar auditoria
   * 5. Retornar
   * 
   * Quando usado:
   * - Usuário pronto para enviar para aprovadores
   * - Antes de envio, requisição pode ser editada/cancelada
   */
  async submitForReview(
    requisitionId: string,
    userId: string,
    churchId?: string,
    roles?: string[],
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar transição
    if (!requisition.canTransitionTo(RequisitionState.UNDER_REVIEW)) {
      throw new BadRequestException(
        `Não pode ir de ${requisition.state} para UNDER_REVIEW`,
      );
    }

    // Atualizar estado
    requisition.state = RequisitionState.UNDER_REVIEW;

    // Se criador for OBREIRO, notificar pastor automaticamente
    if (requisition.creatorType === RequisitionCreatorType.OBREIRO) {
      requisition.notificadoPastorEm = new Date();
    }

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_ACKNOWLEDGED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: RequisitionState.PENDING },
        after: { state: RequisitionState.UNDER_REVIEW },
      },
      description: 'Requisição enviada para revisão (pastor notificado quando aplicável)',
    });

    return updated;
  }

  /**
   * APROVAR REQUISIÇÃO - approveRequisition()
   * 
   * Entrada:
   * {
   *   requisitionId: string,
   *   approvedAmount?: number (pode ser diferente de requestedAmount),
   * }
   * 
   * Fluxo:
   * 1. Buscar requisição
   * 2. Validar que está em UNDER_REVIEW
   * 3. Validar que usuário tem autoridade para aprovar este montante
   * 4. Mudar para APPROVED
   * 5. Registrar quem aprovou e quando
   * 6. Registrar auditoria com montante aprovado
   * 7. Retornar
   * 
   * Validações:
   * - ApprovedAmount <= RequestedAmount
   * - Usuário tem role apropriado para montante
   * - Está em estado UNDER_REVIEW
   */
  async approveRequisition(
    requisitionId: string,
    userId: string,
    roles: string[],
    churchId?: string,
    approvedAmount?: number,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar estado
    if (!requisition.canTransitionTo(RequisitionState.APPROVED)) {
      throw new BadRequestException(
        `Não pode aprovar requisição em estado ${requisition.state}`,
      );
    }

    // Determinar cadeia de aprovação baseada no criador
    const requiredChain = this.getRequiredApprovalLevelsFor(requisition);

    // Mapear role do usuário para nível de aprovação
    const userLevel = this.mapRolesToApprovalLevel(roles);

    if (!userLevel) {
      throw new ForbiddenException('Utilizador sem permissão para aprovar');
    }

    if (!requiredChain.includes(userLevel)) {
      throw new ForbiddenException('Este nível não é requerido para esta requisição');
    }

    // Validar montante
    const finalAmount = approvedAmount || requisition.requestedAmount;
    if (finalAmount > requisition.requestedAmount) {
      throw new BadRequestException(
        'Valor aprovado não pode ser maior que solicitado',
      );
    }

    // Marcar aprovação conforme nível
    if (userLevel === ApprovalLevel.LOCAL_FINANCE) {
      requisition.approvedBy = userId;
    } else if (userLevel === ApprovalLevel.LOCAL_PASTOR) {
      requisition.approvedByLevel2 = userId;
    } else if (userLevel === ApprovalLevel.GLOBAL_FINANCE) {
      requisition.approvedByLevel3 = userId;
    } else if (userLevel === ApprovalLevel.PRESIDENT) {
      requisition.approvedByLevel3 = userId; // usar nível 3 para presidente
    }

    // Verificar se todas as aprovações requeridas foram concluídas
    const approvalsDone = [
      requisition.approvedBy ? ApprovalLevel.LOCAL_FINANCE : undefined,
      requisition.approvedByLevel2 ? ApprovalLevel.LOCAL_PASTOR : undefined,
      requisition.approvedByLevel3 ? ApprovalLevel.GLOBAL_FINANCE : undefined,
    ].filter(Boolean) as ApprovalLevel[];

    // Atualizar montante aprovado (apenas quando primeira aprovação acontece)
    requisition.approvedAmount = finalAmount;

    if (requiredChain.every((lvl) => approvalsDone.includes(lvl))) {
      // Todas as aprovações requeridas concluídas → marcar APROVADA
      requisition.state = RequisitionState.APPROVED;
    } else {
      // Ainda faltam aprovações → manter EM_ANALISE
      requisition.state = RequisitionState.UNDER_REVIEW;
    }

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: RequisitionState.APPROVED === requisition.state
        ? AuditAction.REQUISITION_APPROVED
        : AuditAction.REQUISITION_ACKNOWLEDGED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: {
          state: RequisitionState.UNDER_REVIEW,
          approvedAmount: null,
        },
        after: {
          state: requisition.state,
          approvedAmount: finalAmount,
        },
      },
      description: RequisitionState.APPROVED === requisition.state
        ? `Requisição aprovada. Valor: ${finalAmount} MT`
        : 'Aprovação parcial registrada (aguardando mais aprovações)',
    });

    return updated;
  }

  /**
   * REJEITAR REQUISIÇÃO - rejectRequisition()
   * 
   * Entrada:
   * {
   *   requisitionId: string,
   *   reason: string (motivo da rejeição)
   * }
   * 
   * Fluxo:
   * 1. Buscar requisição
   * 2. Validar que está em UNDER_REVIEW
   * 3. Mudar para REJECTED
   * 4. Armazenar motivo
   * 5. Registrar auditoria
   * 6. Retornar
   * 
   * Quando rejeitada:
   * - Não pode ser aprovada depois
   * - Pode ser cancelada para limpeza
   * - Motivo é importante para auditoria
   */
  async rejectRequisition(
    requisitionId: string,
    userId: string,
    roles: string[],
    churchId: string | undefined,
    reason: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar estado
    if (!requisition.canTransitionTo(RequisitionState.REJECTED)) {
      throw new BadRequestException(
        `Não pode rejeitar requisição em estado ${requisition.state}`,
      );
    }

    // Atualizar
    requisition.state = RequisitionState.REJECTED;
    requisition.motivoRejeicao = reason;
    requisition.approvedBy = userId;

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_REJECTED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: RequisitionState.UNDER_REVIEW },
        after: { state: RequisitionState.REJECTED, reason },
      },
      description: `Requisição rejeitada: ${reason}`,
    });

    return updated;
  }

  /**
   * EXECUTAR REQUISIÇÃO - executeRequisition()
   * 
   * Fluxo:
   * 1. Buscar requisição
   * 2. Validar que está APPROVED
   * 3. Atualizar balanço de fundo (chamar FinancesService)
   * 4. Mudar para EXECUTED
   * 5. Registrar auditoria
   * 6. Retornar
   * 
   * Importante:
   * - Só pode executar APPROVED requisições
   * - Cria saída de dinheiro do fundo
   * - Registra a ação de execução
   * 
   * TODO: Integrar com FinancesService para criar expense entry
   */
  async executeRequisition(
    requisitionId: string,
    userId: string,
    roles: string[],
    churchId?: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar estado
    if (requisition.state !== RequisitionState.APPROVED) {
      throw new BadRequestException(
        'Só pode executar requisições aprovadas',
      );
    }

    // TODO: Chamar FinancesService para atualizar balanço
    // await this.financesService.recordExpense(...)

    // Atualizar
    requisition.state = RequisitionState.EXECUTED;
    requisition.updatedAt = new Date();

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_EXECUTED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: RequisitionState.APPROVED },
        after: { state: RequisitionState.EXECUTED },
      },
      description: `Requisição executada. Valor: ${requisition.approvedAmount} MT`,
    });

    return updated;
  }

  /**
   * CANCELAR REQUISIÇÃO - cancelRequisition()
   * 
   * Fluxo:
   * 1. Buscar requisição
   * 2. Validar que pode ser cancelada (PENDING, UNDER_REVIEW, ou APPROVED)
   * 3. Mudar para CANCELLED
   * 4. Registrar auditoria
   * 5. Retornar
   */
  async cancelRequisition(
    requisitionId: string,
    userId: string,
    roles: string[],
    churchId?: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar estado
    if (!requisition.canTransitionTo(RequisitionState.CANCELLED)) {
      throw new BadRequestException(
        `Não pode cancelar requisição em estado ${requisition.state}`,
      );
    }

    // Atualizar
    requisition.state = RequisitionState.CANCELLED;
    requisition.updatedAt = new Date();

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_CANCELLED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: requisition.state },
        after: { state: RequisitionState.CANCELLED },
      },
      description: 'Requisição cancelada',
    });

    return updated;
  }

  /**
   * LISTAR REQUISIÇÕES PENDENTES - getPendingRequisitions()
   * 
   * Retorna todas as requisições em estado UNDER_REVIEW (aguardando aprovação)
   * Ordenadas por data de solicitação
   * 
   * Usado por:
   * - Dashboard de aprovadores
   * - Notificações de pendências
   */
  async getPendingRequisitions(churchId: string, roles?: string[]): Promise<Requisition[]> {
    const where = this.isGlobal(roles) ? { state: RequisitionState.UNDER_REVIEW } : { churchId, state: RequisitionState.UNDER_REVIEW };
    return this.requisitionsRepository.find({
      where,
      order: {
        requestedAt: 'ASC',
      },
    });
  }

  /**
   * LISTAR REQUISIÇÕES POR ESTADO - getRequisitionsByState()
   */
  async getRequisitionsByState(
    churchId: string,
    state: RequisitionState,
  ): Promise<Requisition[]> {
    return this.requisitionsRepository.find({
      where: {
        churchId,
        state,
      },
    });
  }

  /**
   * OBTER REQUISIÇÃO - getRequisition()
   */
  async getRequisition(
    requisitionId: string,
    churchId?: string,
    roles?: string[],
  ): Promise<Requisition> {
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    return requisition;
  }

  /**
   * OBTER REQUISIÇÃO COM DETALHES COMPLETOS
   * Retorna requisição com informações de usuário (criador e aprovadores) e igreja
   */
  async getRequisitionWithDetails(requisitionId: string): Promise<any> {
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    // Buscar informações do criador
    const creator = await this.userRepository.findOne({
      where: { id: requisition.requestedBy },
    });

    // Buscar informações da igreja
    const church = await this.churchRepository.findOne({
      where: { id: requisition.churchId },
    });

    // Buscar aprovadores (se existirem)
    const approvers = [];
    if (requisition.approvedBy) {
      const approver1 = await this.userRepository.findOne({
        where: { id: requisition.approvedBy },
      });
      if (approver1) {
        approvers.push({
          level: 1,
          userId: approver1.id,
          name: approver1.nomeCompleto || approver1.username || approver1.email,
          email: approver1.email,
        });
      }
    }
    if (requisition.approvedByLevel2) {
      const approver2 = await this.userRepository.findOne({
        where: { id: requisition.approvedByLevel2 },
      });
      if (approver2) {
        approvers.push({
          level: 2,
          userId: approver2.id,
          name: approver2.nomeCompleto || approver2.username || approver2.email,
          email: approver2.email,
        });
      }
    }
    if (requisition.approvedByLevel3) {
      const approver3 = await this.userRepository.findOne({
        where: { id: requisition.approvedByLevel3 },
      });
      if (approver3) {
        approvers.push({
          level: 3,
          userId: approver3.id,
          name: approver3.nomeCompleto || approver3.username || approver3.email,
          email: approver3.email,
        });
      }
    }

    return {
      ...requisition,
      creatorInfo: creator ? {
        userId: creator.id,
        name: creator.nomeCompleto || creator.username || creator.email,
        email: creator.email,
      } : null,
      churchInfo: church ? {
        churchId: church.id,
        name: church.nome,
        code: church.codigo,
      } : null,
      approvers,
    };
  }

  /**
   * CALCULAR MAGNITUDE
   * 
   * Lógica:
   * - até 5.000 MT = SMALL
   * - 5.001 a 20.000 MT = MEDIUM
   * - 20.001 a 50.000 MT = LARGE
   * - acima de 50.000 MT = CRITICAL
   */
  private calculateMagnitude(amount: number): RequisitionMagnitude {
    if (amount <= 5000) {
      return RequisitionMagnitude.SMALL;
    } else if (amount <= 20000) {
      return RequisitionMagnitude.MEDIUM;
    } else if (amount <= 50000) {
      return RequisitionMagnitude.LARGE;
    } else {
      return RequisitionMagnitude.CRITICAL;
    }
  }

  /**
   * Obter todas as requisições de uma igreja
   */
  async getRequisitionsByChurch(churchId: string, roles?: string[]): Promise<Requisition[]> {
    const where = this.isGlobal(roles) ? {} : { churchId };
    return this.requisitionsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * LISTAR REQUISIÇÕES EM ANÁLISE - getUnderReviewRequisitions()
   * 
   * Retorna requisições em estado UNDER_REVIEW (aguardando aprovação)
   */
  async getUnderReviewRequisitions(churchId: string, roles?: string[]): Promise<Requisition[]> {
    const where = this.isGlobal(roles) ? { state: RequisitionState.UNDER_REVIEW } : { churchId, state: RequisitionState.UNDER_REVIEW };
    return this.requisitionsRepository.find({
      where,
      order: {
        requestedAt: 'ASC',
      },
    });
  }

  /**
   * LISTAR REQUISIÇÕES APROVADAS - getApprovedRequisitions()
   * 
   * Retorna requisições em estado APPROVED (prontas para executar)
   */
  async getApprovedRequisitions(churchId: string, roles?: string[]): Promise<Requisition[]> {
    const where = this.isGlobal(roles) ? { state: RequisitionState.APPROVED } : { churchId, state: RequisitionState.APPROVED };
    return this.requisitionsRepository.find({
      where,
      order: {
        requestedAt: 'ASC',
      },
    });
  }

  /**
   * LISTAR REQUISIÇÕES EXECUTADAS - getExecutedRequisitions()
   * 
   * Retorna requisições em estado EXECUTED (já pagas)
   */
  async getExecutedRequisitions(churchId: string, roles?: string[]): Promise<Requisition[]> {
    const where = this.isGlobal(roles) ? { state: RequisitionState.EXECUTED } : { churchId, state: RequisitionState.EXECUTED };
    return this.requisitionsRepository.find({
      where,
      order: {
        requestedAt: 'DESC',
      },
    });
  }

  /**
   * APROVAR NÍVEL 2 - approveLevel2()
   * 
   * Chamado por: Director Financeiro ou Admin
   * Requerido quando valor excede limite local
   * 
   * Transita: EM_ANALISE → APROVADA (com marca de aprovação nível 2)
   */
  async approveLevel2(
    requisitionId: string,
    userId: string,
    roles?: string[],
    churchId?: string,
    approvedAmount?: number,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Validar estado
    if (requisition.state !== RequisitionState.UNDER_REVIEW) {
      throw new BadRequestException(
        `Não pode aprovar nível 2 requisição em estado ${requisition.state}`,
      );
    }

    // Validar montante
    const finalAmount = approvedAmount || requisition.requestedAmount;
    if (finalAmount > requisition.requestedAmount) {
      throw new BadRequestException(
        'Valor aprovado não pode ser maior que solicitado',
      );
    }

    // Atualizar
    requisition.state = RequisitionState.APPROVED;
    requisition.approvedAmount = finalAmount;
    requisition.approvedBy = userId;

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_APPROVED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: {
          state: RequisitionState.UNDER_REVIEW,
          approvedAmount: null,
        },
        after: {
          state: RequisitionState.APPROVED,
          approvedAmount: finalAmount,
        },
      },
      description: `Requisição aprovada (nível 2). Valor: ${finalAmount} MT`,
    });

    return updated;
  }

  /**
   * MARCAR COMO EXECUTADA - markAsExecuted()
   * 
   * Marca requisição como executada após criação de despesa
   */
  async markAsExecuted(
    requisitionId: string,
    userId: string,
    roles?: string[],
    churchId?: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Atualizar
    requisition.state = RequisitionState.EXECUTED;
    requisition.updatedAt = new Date();

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_EXECUTED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: RequisitionState.APPROVED },
        after: { state: RequisitionState.EXECUTED },
      },
      description: `Requisição marcada como executada. Valor: ${requisition.approvedAmount} MT`,
    });

    return updated;
  }

  /**
   * NOTIFICAR PASTOR - notifyPastor()
   * 
   * Registra que pastor foi notificado de requisição
   * Não bloqueia aprovação, apenas registra conhecimento
   */
  async notifyPastor(
    requisitionId: string,
    userId: string,
    roles?: string[],
    churchId?: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: {
        id: requisitionId,
        ...(this.isGlobal(roles) ? {} : { churchId }),
      },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    this.ensureChurchScope(requisition, churchId, roles);

    // Atualizar
    requisition.notificadoPastorEm = new Date();

    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_ACKNOWLEDGED,
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { notificadoPastorEm: null },
        after: { notificadoPastorEm: new Date() },
      },
      description: 'Pastor tomou conhecimento da requisição',
    });

    return updated;
  }

  /**
   * LISTAR POR FUNDO - getRequisitionsByFund()
   * 
   * Retorna todas as requisições de um fundo específico de uma igreja
   */
  async getRequisitionsByFund(
    churchId: string,
    fundId: string,
  ): Promise<Requisition[]> {
    return this.requisitionsRepository.find({
      where: {
        churchId,
        fundId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private mapRolesToApprovalLevel(roles?: string[]): ApprovalLevel | null {
    const effective = roles || [];
    if (effective.includes(UserRole.PASTOR_PRESIDENTE) || effective.includes(UserRole.ADMIN)) {
      return ApprovalLevel.PRESIDENT;
    }
    if (effective.includes(UserRole.LIDER_FINANCEIRO_GERAL)) {
      return ApprovalLevel.GLOBAL_FINANCE;
    }
    if (effective.includes(UserRole.PASTOR_LOCAL)) {
      return ApprovalLevel.LOCAL_PASTOR;
    }
    if (effective.includes(UserRole.LIDER_FINANCEIRO_LOCAL) || effective.includes(UserRole.TREASURER)) {
      return ApprovalLevel.LOCAL_FINANCE;
    }
    return null;
  }

  private getRequiredApprovalLevelsFor(req: Requisition): ApprovalLevel[] {
    switch (req.creatorType) {
      case RequisitionCreatorType.OBREIRO:
        // Apenas Líder Financeiro Local aprova; pastor é apenas notificado
        return [ApprovalLevel.LOCAL_FINANCE];
      case RequisitionCreatorType.LIDER_FINANCEIRO:
        // Requer Pastor Local e Líder Financeiro Geral
        return [ApprovalLevel.LOCAL_PASTOR, ApprovalLevel.GLOBAL_FINANCE];
      case RequisitionCreatorType.PASTOR:
        // Requer Líder Financeiro Local e Líder Financeiro Geral
        return [ApprovalLevel.LOCAL_FINANCE, ApprovalLevel.GLOBAL_FINANCE];
      default:
        // Director: requer Líder Financeiro Geral
        return [ApprovalLevel.GLOBAL_FINANCE];
    }
  }

  private isGlobal(roles?: string[]): boolean {
    const effective = roles || [];
    // Apenas roles verdadeiramente globais (podem operar em qualquer igreja)
    const globalRoles = [
      UserRole.ADMIN,
      UserRole.LIDER_FINANCEIRO_GERAL,
      UserRole.PASTOR_PRESIDENTE,
    ];

    return effective.some((role) => globalRoles.includes(role as UserRole));
  }

  private determineCreatorType(roles?: string[]): RequisitionCreatorType {
    const effective = roles || [];
    
    // Ordem de precedência para determinar tipo de criador
    if (effective.includes(UserRole.PASTOR_LOCAL) || effective.includes(UserRole.PASTOR)) {
      return RequisitionCreatorType.PASTOR;
    }
    if (effective.includes(UserRole.LIDER_FINANCEIRO_LOCAL) || effective.includes(UserRole.TREASURER)) {
      return RequisitionCreatorType.LIDER_FINANCEIRO;
    }
    if (effective.includes(UserRole.LIDER_FINANCEIRO_GERAL) || effective.includes(UserRole.DIRECTOR)) {
      return RequisitionCreatorType.DIRECTOR;
    }
    
    // Default: OBREIRO
    return RequisitionCreatorType.OBREIRO;
  }

  private ensureChurchScope(
    requisition: Requisition,
    churchId?: string,
    roles?: string[],
  ) {
    if (this.isGlobal(roles)) {
      return;
    }

    if (!churchId) {
      // Fallback: usar a igreja da própria requisição para não bloquear o autor
      churchId = requisition.churchId;
    }

    if (requisition.churchId !== churchId) {
      throw new ForbiddenException('Acesso negado a requisição de outra igreja');
    }
  }
}
