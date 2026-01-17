import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequisitionsService } from './requisitions.service';
import { ExpenseService } from '../finances/expense.service';
import { Requisition, RequisitionCreatorType } from './entities/requisition.entity';

/**
 * CONTROLADOR ATUALIZADO DE REQUISIÇÕES (RequisitionsController v2)
 * 
 * Endpoints para fluxo de requisições com aprovações multi-nível:
 * 
 * 1. POST /requisitions - Criar requisição
 * 2. GET /requisitions - Listar todas
 * 3. GET /requisitions/pending - Pendentes (para Líder Financeiro)
 * 4. GET /requisitions/under-review - Em análise
 * 5. GET /requisitions/approved - Aprovadas (prontas para executar)
 * 6. PATCH /requisitions/:id - Obter detalhes
 * 7. PATCH /requisitions/:id/submit - Enviar para análise
 * 8. PATCH /requisitions/:id/approve - Aprovar (nível 1)
 * 9. PATCH /requisitions/:id/approve-level2 - Aprovar (nível 2)
 * 10. PATCH /requisitions/:id/reject - Rejeitar
 * 11. PATCH /requisitions/:id/execute - Executar pagamento
 * 12. PATCH /requisitions/:id/acknowledge-pastor - Pastor toma conhecimento
 * 
 * Autenticação: JWT obrigatório
 * Isolamento: churchId do JWT garante acesso apenas à sua igreja
 */
@UseGuards(JwtAuthGuard)
@Controller('requisitions')
export class RequisitionsController {
  constructor(
    private requisitionsService: RequisitionsService,
    private expenseService: ExpenseService,
  ) {}

  /**
   * CRIAR REQUISIÇÃO - POST /requisitions
   * 
   * Body:
   * {
   *   "fundId": "uuid",
   *   "valor": 25000,
   *   "categoria": "ALIMENTACAO",
   *   "motivo": "Refeições para retiro espiritual",
   *   "creatorType": "OBREIRO" | "LIDER_FINANCEIRO"
   * }
   * 
   * Resposta (201):
   * Requisition com estado PENDENTE
   * 
   * Validações:
   * - Valor > 0
   * - Motivo não vazio
   * - Fundo existe e pertence à igreja
   * - creatorType válido
   */
  @Post()
  async createRequisition(
    @Body()
    body: {
      fundId: string;
      valor: number;
      categoria: string;
      motivo: string;
      creatorType?: RequisitionCreatorType;
    },
    @Req() req: any,
  ): Promise<Requisition> {
    const churchId = req.user.churchId;
    const userId = req.user.sub || req.user.userId;

    return this.requisitionsService.createRequisition(
      churchId,
      userId,
      {
        fundId: body.fundId,
        category: body.categoria,
        requestedAmount: body.valor,
        justification: body.motivo,
        creatorType: body.creatorType,
      },
    );
  }

  /**
   * OBTER REQUISIÇÃO - GET /requisitions/:id
   */
  @Get(':id')
  async getRequisition(@Param('id') id: string): Promise<Requisition | null> {
    return this.requisitionsService.getRequisition(id);
  }

  /**
   * LISTAR TODAS - GET /requisitions
   */
  @Get()
  async listAllRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getRequisitionsByChurch(churchId);
  }

  /**
   * LISTAR PENDENTES - GET /requisitions/status/pending
   * 
   * Mostra requisições que precisam de ação:
   * - PENDENTE: Ainda não foram analisadas
   */
  @Get('status/pending')
  async getPendingRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getPendingRequisitions(churchId);
  }

  /**
   * LISTAR EM ANÁLISE - GET /requisitions/status/under-review
   */
  @Get('status/under-review')
  async getUnderReviewRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getUnderReviewRequisitions(churchId);
  }

  /**
   * LISTAR APROVADAS - GET /requisitions/status/approved
   * 
   * Mostra requisições prontas para executar
   */
  @Get('status/approved')
  async getApprovedRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getApprovedRequisitions(churchId);
  }

  /**
   * LISTAR EXECUTADAS - GET /requisitions/status/executed
   */
  @Get('status/executed')
  async getExecutedRequisitions(@Req() req: any): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getExecutedRequisitions(churchId);
  }

  /**
   * ENVIAR PARA ANÁLISE - PATCH /requisitions/:id/submit
   * 
   * Transita PENDENTE → EM_ANALISE
   * Chamado automáticamente ou manualmente
   */
  @Patch(':id/submit')
  async submitForReview(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub || req.user.userId;
    return this.requisitionsService.submitForReview(id, userId);
  }

  /**
   * APROVAR NÍVEL 1 - PATCH /requisitions/:id/approve
   * 
   * Chamado por: Líder Financeiro
   * 
   * Body:
   * {
   *   "approvedAmount": 25000 (opcional, padrão = requestedAmount)
   * }
   * 
   * Lógica:
   * - Se valor ≤ limite → transita para APROVADA
   * - Se valor > limite → requer aprovação nível 2 (director)
   *   Neste caso, permanece EM_ANALISE mas marca approvedBy nível 1
   */
  @Patch(':id/approve')
  async approveRequisition(
    @Param('id') id: string,
    @Body() body: { approvedAmount?: number },
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub || req.user.userId;
    return this.requisitionsService.approveRequisition(
      id,
      userId,
      body.approvedAmount,
    );
  }

  /**
   * APROVAR NÍVEL 2 - PATCH /requisitions/:id/approve-level2
   * 
   * Chamado por: Director Financeiro ou Admin
   * Requerido quando valor excede limite local
   * 
   * Body:
   * {
   *   "approvedAmount": 25000 (opcional)
   * }
   * 
   * Transita: EM_ANALISE → APROVADA (com marca de aprovação nível 2)
   */
  @Patch(':id/approve-level2')
  async approveLevel2(
    @Param('id') id: string,
    @Body() body: { approvedAmount?: number },
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub || req.user.userId;
    return this.requisitionsService.approveLevel2(id, userId, body.approvedAmount);
  }

  /**
   * REJEITAR - PATCH /requisitions/:id/reject
   * 
   * Chamado por: Líder Financeiro ou Director
   * 
   * Body:
   * {
   *   "motivo": "Justificativa incompleta"
   * }
   * 
   * Transita: EM_ANALISE ou PENDENTE → REJEITADA
   * Requisição não pode mais ser executada
   */
  @Patch(':id/reject')
  async rejectRequisition(
    @Param('id') id: string,
    @Body() body: { motivo: string },
    @Req() req: any,
  ): Promise<Requisition> {
    if (!body.motivo || body.motivo.trim().length === 0) {
      throw new BadRequestException('Motivo da rejeição é obrigatório');
    }

    const userId = req.user.sub || req.user.userId;
    return this.requisitionsService.rejectRequisition(id, userId, body.motivo);
  }

  /**
   * EXECUTAR PAGAMENTO - PATCH /requisitions/:id/execute
   * 
   * Chamado por: Líder Financeiro
   * 
   * Body:
   * {
   *   "dataPagamento": "2024-01-15",
   *   "comprovativoUrl": "url/comprovante.pdf",
   *   "observacoes": "Transferência bancária ref ABC123"
   * }
   * 
   * Fluxo:
   * 1. Validar que requisição está APROVADA
   * 2. Chamar ExpenseService.createExpense()
   * 3. ExpenseService cria:
   *    - Despesa (registro de pagamento)
   *    - MovimentoFinanceiro SAIDA
   *    - Decrementa Fund.balance
   * 4. RequisitionsService marca como EXECUTADA
   * 5. Auditoria registra tudo
   * 
   * Retorna: Requisição com estado EXECUTADA
   */
  @Patch(':id/execute')
  async executeRequisition(
    @Param('id') id: string,
    @Body()
    body: {
      dataPagamento: string;
      comprovativoUrl?: string;
      observacoes?: string;
    },
    @Req() req: any,
  ): Promise<{
    requisicao: Requisition;
    despesa?: any;
  }> {
    const userId = req.user.sub || req.user.userId;
    const churchId = req.user.churchId;

    // Obter requisição
    const requisicao = await this.requisitionsService.getRequisition(id);
    if (!requisicao) {
      throw new BadRequestException('Requisição não encontrada');
    }

    if (requisicao.churchId !== churchId) {
      throw new BadRequestException(
        'Você não tem permissão para executar esta requisição',
      );
    }

    // Criar despesa
    const despesa = await this.expenseService.createExpense({
      requisicaoId: id,
      fundId: requisicao.fundId,
      churchId,
      valor: requisicao.approvedAmount || requisicao.requestedAmount,
      dataPagamento: new Date(body.dataPagamento),
      executadoPor: userId,
      comprovativoUrl: body.comprovativoUrl,
      observacoes: body.observacoes,
    });

    // Marcar requisição como executada
    const updated = await this.requisitionsService.markAsExecuted(id, userId);

    return {
      requisicao: updated,
      despesa,
    };
  }

  /**
   * PASTOR TOMA CONHECIMENTO - PATCH /requisitions/:id/acknowledge-pastor
   * 
   * Chamado por: Pastor da igreja
   * Registra que pastor foi notificado de requisição
   * 
   * Não bloqueia aprovação, apenas registra conhecimento
   * Usado para transparência
   */
  @Patch(':id/acknowledge-pastor')
  async acknowledgePastor(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Requisition> {
    const userId = req.user.sub || req.user.userId;
    return this.requisitionsService.notifyPastor(id, userId);
  }

  /**
   * LISTAR POR FUNDO - GET /requisitions/fund/:fundId
   */
  @Get('fund/:fundId')
  async getRequisitionsByFund(
    @Param('fundId') fundId: string,
    @Req() req: any,
  ): Promise<Requisition[]> {
    const churchId = req.user.churchId;
    return this.requisitionsService.getRequisitionsByFund(churchId, fundId);
  }
}
