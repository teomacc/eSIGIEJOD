import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequisitionsService } from './requisitions.service';
import { Requisition, RequisitionState } from './entities/requisition.entity';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';

/**
 * CONTROLADOR DE REQUISIÇÕES (RequisitionsController)
 * 
 * Responsabilidade: Gerir endpoints REST para requisições de despesa
 * 
 * Endpoints:
 * - POST /requisitions - Criar requisição
 * - GET /requisitions/:id - Obter detalhes
 * - GET /requisitions - Listar requisições da iglesia
 * - GET /requisitions/pending - Listar pendentes (para aprovadores)
 * - PUT /requisitions/:id/submit - Enviar para revisão
 * - PUT /requisitions/:id/approve - Aprovar
 * - PUT /requisitions/:id/reject - Rejeitar
 * - PUT /requisitions/:id/execute - Executar
 * - PUT /requisitions/:id/cancel - Cancelar
 * 
 * Autenticação:
 * - @UseGuards(AuthGuard('jwt')) - Requer JWT válido
 * - churchId extraído do JWT para isolamento
 * 
 * Fluxo de Requisição (ciclo de vida):
 * 1. Criar (PENDING)
 * 2. Enviar (UNDER_REVIEW)
 * 3. Approver: Aprovar ou Rejeitar
 * 4. Se aprovado: Executar (muda para EXECUTED)
 * 
 * Autorização:
 * - Criar: Qualquer usuário pode criar para sua iglesia
 * - Aprovar: Requer role apropriado (TREASURER, DIRECTOR, PASTOR)
 * - Executar: TREASURER ou acima
 */
@Controller('requisitions')
@UseGuards(AuthGuard('jwt'), ChurchScopeGuard)
export class RequisitionsController {
  constructor(private requisitionsService: RequisitionsService) {}

  /**
   * CRIAR REQUISIÇÃO - POST /requisitions
   * 
   * Body:
   * {
   *   "fundId": "uuid da iglesia",
   *   "category": "MATERIALS" | "PERSONNEL" | "MAINTENANCE" | etc,
   *   "requestedAmount": 15000,
   *   "justification": "Compra de cadeiras para sala de adoração",
   *   "attachments": ["url/receipt.pdf", "url/budget.pdf"]
   * }
   * 
   * Retorno (201 Created):
   * {
   *   "id": "uuid",
   *   "code": "REQ-2024-001",
   *   "churchId": "uuid",
   *   "fundId": "uuid",
   *   "requestedBy": "userId",
   *   "category": "MATERIALS",
   *   "requestedAmount": 15000,
   *   "magnitude": "MEDIUM",
   *   "state": "PENDING",
   *   "justification": "...",
   *   "requestedAt": "2024-01-15T10:00:00Z"
   * }
   * 
   * Fluxo:
   * 1. JWT extraído automaticamente por AuthGuard
   * 2. churchId e userId extraídos de req.user
   * 3. Chamar RequisitionsService.createRequisition()
   * 4. Serviço calcula magnitude (com base na amount)
   * 5. Serviço cria AuditLog
   * 6. Retornar requisição criada (201)
   * 
   * Validações feitas pelo serviço:
   * - requestedAmount > 0
   * - fundId válido
   * - category válido
   */
  @Post()
  async createRequisition(
    @Body()
    createRequisitionDto: {
      fundId: string;
      category: string;
      requestedAmount: number;
      justification: string;
      attachments?: string[];
    },
    @Req() req: any,
  ): Promise<Requisition> {
    // Extrair informações do JWT
    const churchId = this.resolveChurchId(req);
    const userId = req.user.sub; // 'sub' é o userId no JWT

    // Chamar serviço
    return this.requisitionsService.createRequisition(
      churchId,
      userId,
      createRequisitionDto,
    );
  }

  /**
   * OBTER REQUISIÇÃO - GET /requisitions/{id}
   * 
   * Path param:
   * - id: ID da requisição
   * 
   * Retorno (200 OK):
   * Objeto Requisition completo com todos os dados
   * 
   * Fluxo:
   * 1. Extrato ID do URL
   * 2. Chamar RequisitionsService.getRequisition()
   * 3. Validar que requisição existe
   * 4. Retornar
   * 
   * Exemplo:
   * GET /requisitions/abc-123-def
   */
  @Get(':id')
  async getRequisition(@Param('id') id: string, @Req() req: any): Promise<Requisition> {
    const churchId = this.resolveChurchId(req);
    const roles = this.resolveRoles(req);
    return this.requisitionsService.getRequisition(id, churchId, roles);
  }

  /**
   * LISTAR REQUISIÇÕES - GET /requisitions
   * 
   * Query params:
   * - state: Filtrar por estado (opcional)
   * - limit: Máximo de resultados (padrão: 50)
   * - offset: Deslocamento para pagination (padrão: 0)
   * 
   * Retorno (200 OK):
   * {
   *   "data": [
   *     { id, code, state, requestedAmount, ... },
   *     { ... }
   *   ],
   *   "pagination": {
   *     "total": 150,
   *     "limit": 50,
   *     "offset": 0,
   *     "pages": 3
   *   }
   * }
   * 
   * Fluxo:
   * 1. Extrair churchId de JWT
   * 2. Se state fornecido, filtrar por estado
   * 3. Aplicar pagination (limit + offset)
   * 4. Retornar com informações de pagination
   * 
   * Exemplo:
   * GET /requisitions?state=PENDING&limit=25
   * Mostra primeiras 25 requisições pendentes
   */
  @Get()
  async listRequisitions(
    @Req() req: any,
  ): Promise<{
    data: Requisition[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      pages: number;
    };
  }> {
    // Extrair churchId
    const churchId = this.resolveChurchId(req);

    // TODO: Implementar listar com paginação
    // Por enquanto, retornar empty array
    return {
      data: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        pages: 0,
      },
    };
  }

  /**
   * LISTAR PENDENTES - GET /requisitions/pending
   * 
   * Retorna todas as requisições em estado UNDER_REVIEW
   * (Aguardando aprovação)
   * 
   * Retorno (200 OK):
   * Array de requisições pendentes
   * 
   * Fluxo:
   * 1. Extrair churchId
   * 2. Chamar RequisitionsService.getPendingRequisitions()
   * 3. Retornar lista
   * 
   * Usado por:
   * - Dashboard de aprovadores
   * - Notificações
   * - Reports de pendências
   */
  @Get('pending')
  async getPendingRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = this.resolveChurchId(req);
    return this.requisitionsService.getPendingRequisitions(churchId);
  }

  /**
   * ENVIAR PARA REVISÃO - PUT /requisitions/{id}/submit
   * 
   * Muda estado de PENDING para UNDER_REVIEW
   * Requisição fica aguardando aprovadores
   * 
   * Retorno (200 OK):
   * Requisição atualizada com state = UNDER_REVIEW
   * 
   * Fluxo:
   * 1. Extrair ID e userId
   * 2. Chamar RequisitionsService.submitForReview()
   * 3. Serviço valida transição
   * 4. Serviço registra AuditLog
   * 5. Retornar requisição atualizada
   * 
   * Exemplo:
   * PUT /requisitions/abc-123/submit
   */
  @Put(':id/submit')
  async submitForReview(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub;
    const churchId = this.resolveChurchId(req);
    const roles = this.resolveRoles(req);
    return this.requisitionsService.submitForReview(id, userId, churchId, roles);
  }

  /**
   * APROVAR - PUT /requisitions/{id}/approve
   * 
   * Body (opcional):
   * {
   *   "approvedAmount": 10000  // Pode ser menor que requestedAmount
   * }
   * 
   * Retorno (200 OK):
   * {
   *   "id": "uuid",
   *   "state": "APPROVED",
   *   "requestedAmount": 15000,
   *   "approvedAmount": 10000,
   *   "approvedBy": "userId",
   *   "approvedAt": "2024-01-15T11:00:00Z"
   * }
   * 
   * Fluxo:
   * 1. Extrair ID e userId
   * 2. Chamar RequisitionsService.approveRequisition()
   * 3. Serviço valida:
   *    - Requisição em estado UNDER_REVIEW
   *    - approvedAmount <= requestedAmount
   *    - usuário tem autoridade (verificado em middleware)
   * 4. Serviço atualiza approvedAmount, approvedBy, approvedAt
   * 5. Serviço registra AuditLog
   * 6. Retornar atualizada
   * 
   * Autorização:
   * - Requer role apropriado baseado em magnitude
   * - SMALL (até 5k): TREASURER
   * - MEDIUM (5k-20k): DIRECTOR
   * - LARGE (20k-50k): BOARD
   * - CRITICAL (>50k): PASTOR
   * 
   * Exemplo:
   * PUT /requisitions/abc-123/approve
   * {
   *   "approvedAmount": 10000
   * }
   */
  @Put(':id/approve')
  async approveRequisition(
    @Param('id') id: string,
    @Body() body: { approvedAmount?: number },
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub;
    const roles = this.resolveRoles(req);
    const churchId = this.resolveChurchId(req);
    return this.requisitionsService.approveRequisition(
      id,
      userId,
      roles,
      churchId,
      body.approvedAmount,
    );
  }

  /**
   * REJEITAR - PUT /requisitions/{id}/reject
   * 
   * Body:
   * {
   *   "reason": "Orçamento para materiais já foi consumido este mês"
   * }
   * 
   * Retorno (200 OK):
   * {
   *   "id": "uuid",
   *   "state": "REJECTED",
   *   "rejectionReason": "...",
   *   "approvedBy": "userId",
   *   "approvedAt": "2024-01-15T11:00:00Z"
   * }
   * 
   * Fluxo:
   * 1. Extrair ID, userId, e reason
   * 2. Chamar RequisitionsService.rejectRequisition()
   * 3. Serviço valida estado UNDER_REVIEW
   * 4. Serviço muda para REJECTED
   * 5. Serviço registra AuditLog com motivo
   * 6. Retornar atualizada
   * 
   * Importante:
   * - Requisição rejeitada não pode ser aprovada depois
   * - Motivo é importante para auditoria/compliance
   * - Usuário que solicitou será notificado
   * 
   * Exemplo:
   * PUT /requisitions/abc-123/reject
   * {
   *   "reason": "Sem orçamento disponível"
   * }
   */
  @Put(':id/reject')
  async rejectRequisition(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub;
    const roles = this.resolveRoles(req);
    const churchId = this.resolveChurchId(req);
    return this.requisitionsService.rejectRequisition(
      id,
      userId,
      roles,
      churchId,
      body.reason,
    );
  }

  /**
   * EXECUTAR - PUT /requisitions/{id}/execute
   * 
   * Muda estado de APPROVED para EXECUTED
   * Registra saída de dinheiro do fundo
   * 
   * Retorno (200 OK):
   * {
   *   "id": "uuid",
   *   "state": "EXECUTED",
   *   "approvedAmount": 10000
   * }
   * 
   * Fluxo:
   * 1. Extrair ID e userId
   * 2. Chamar RequisitionsService.executeRequisition()
   * 3. Serviço valida estado APPROVED
   * 4. Serviço chama FinancesService para registrar saída
   * 5. Serviço muda para EXECUTED
   * 6. Serviço registra AuditLog
   * 7. Retornar atualizada
   * 
   * Autorização:
   * - TREASURER ou acima
   * 
   * Importante:
   * - Só pode executar requisições já aprovadas
   * - Atualiza balanço de fundo (subtrai approvedAmount)
   * - Cria entry em expense log
   * 
   * Exemplo:
   * PUT /requisitions/abc-123/execute
   */
  @Put(':id/execute')
  async executeRequisition(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub;
    const churchId = this.resolveChurchId(req);
    const roles = this.resolveRoles(req);
    return this.requisitionsService.executeRequisition(
      id,
      userId,
      roles,
      churchId,
    );
  }

  /**
   * CANCELAR - PUT /requisitions/{id}/cancel
   * 
   * Muda estado para CANCELLED
   * Pode ser feito em estados: PENDING, UNDER_REVIEW, APPROVED
   * 
   * Retorno (200 OK):
   * {
   *   "id": "uuid",
   *   "state": "CANCELLED"
   * }
   * 
   * Fluxo:
   * 1. Extrair ID e userId
   * 2. Chamar RequisitionsService.cancelRequisition()
   * 3. Serviço valida que pode ser cancelada
   * 4. Serviço muda para CANCELLED
   * 5. Serviço registra AuditLog
   * 6. Retornar atualizada
   * 
   * Quando cancelar:
   * - Usuário muda de ideia antes de executar
   * - Necessidade já foi atendida de outra forma
   * - Limpeza de requisições antigas
   * 
   * Exemplo:
   * PUT /requisitions/abc-123/cancel
   */
  @Put(':id/cancel')
  async cancelRequisition(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub;
    const churchId = this.resolveChurchId(req);
    const roles = this.resolveRoles(req);
    return this.requisitionsService.cancelRequisition(
      id,
      userId,
      roles,
      churchId,
    );
  }

  private resolveChurchId(req: any): string {
    const churchId = req.churchId || req.user?.churchId || req.query?.churchId;
    if (!churchId) {
      throw new BadRequestException('Necessário indicar igreja para operar');
    }
    return churchId;
  }

  private resolveRoles(req: any): string[] {
    return req.user?.roles || [];
  }
}
