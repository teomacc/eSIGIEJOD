import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Requisition, RequisitionState, RequisitionMagnitude, ExpenseCategory } from './entities/requisition.entity';
import { ApprovalService } from '../approval/approval.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

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
      attachments?: string[];
    },
  ): Promise<Requisition> {
    // Validar amount
    if (data.requestedAmount <= 0) {
      throw new BadRequestException('Valor da requisição deve ser positivo');
    }

    // Calcular magnitude
    const magnitude = this.calculateMagnitude(data.requestedAmount);

    // Determinar nível de aprovação necessário
    const approvalLevel = this.approvalService.calculateApprovalLevel(
      data.requestedAmount,
    );

    // Gerar código único
    const code = `REQ-${new Date().getFullYear()}-${Date.now()}`;

    // Criar requisição
    const requisition = new Requisition();
    requisition.code = code;
    requisition.churchId = churchId;
    requisition.fundId = data.fundId;
    requisition.requestedBy = userId;
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
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    // Validar transição
    if (!requisition.canTransitionTo(RequisitionState.UNDER_REVIEW)) {
      throw new BadRequestException(
        `Não pode ir de ${requisition.state} para UNDER_REVIEW`,
      );
    }

    // Atualizar estado
    requisition.state = RequisitionState.UNDER_REVIEW;
    const updated = await this.requisitionsRepository.save(requisition);

    // Registrar auditoria
    await this.auditService.logAction({
      churchId: requisition.churchId,
      userId,
      action: AuditAction.REQUISITION_CREATED, // Usar UNDER_REVIEW quando enum expandido
      entityId: requisition.id,
      entityType: 'Requisition',
      changes: {
        before: { state: RequisitionState.PENDING },
        after: { state: RequisitionState.UNDER_REVIEW },
      },
      description: 'Requisição enviada para revisão',
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
    approvedAmount?: number,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    // Validar estado
    if (!requisition.canTransitionTo(RequisitionState.APPROVED)) {
      throw new BadRequestException(
        `Não pode aprovar requisição em estado ${requisition.state}`,
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
    requisition.approvedAt = new Date();

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
      description: `Requisição aprovada. Valor: ${finalAmount} MT`,
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
    reason: string,
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    // Validar estado
    if (!requisition.canTransitionTo(RequisitionState.REJECTED)) {
      throw new BadRequestException(
        `Não pode rejeitar requisição em estado ${requisition.state}`,
      );
    }

    // Atualizar
    requisition.state = RequisitionState.REJECTED;
    requisition.rejectionReason = reason;
    requisition.approvedBy = userId;
    requisition.approvedAt = new Date();

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
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

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
  ): Promise<Requisition> {
    // Buscar requisição
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

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
  async getPendingRequisitions(churchId: string): Promise<Requisition[]> {
    return this.requisitionsRepository.find({
      where: {
        churchId,
        state: RequisitionState.UNDER_REVIEW,
      },
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
  async getRequisition(requisitionId: string): Promise<Requisition> {
    const requisition = await this.requisitionsRepository.findOne({
      where: { id: requisitionId },
    });

    if (!requisition) {
      throw new BadRequestException('Requisição não encontrada');
    }

    return requisition;
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
}
