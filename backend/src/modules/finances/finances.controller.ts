import { Controller, Post, Get, Param, Body, Req, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { ExpenseService } from './expense.service';
import { FinancialMovementService } from './financial-movement.service';
import { IncomeType } from './entities/income.entity';
import { RevenueType, PaymentMethod } from './entities/revenue.entity';
import { Weekday, WorshipType } from './entities/worship.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';

/**
 * CONTROLADOR DE FINANÇAS (FinancesController)
 * 
 * Responsabilidade: Gerir endpoints HTTP para operações financeiras
 * 
 * Endpoints:
 * - POST /finances/income - Registar entrada
 * - GET /finances/fund/{id}/balance - Obter saldo
 * - GET /finances/income/church - Listar entradas da igreja
 * - GET /finances/income/fund/{id} - Listar entradas do fundo
 * 
 * Padrão RESTful:
 * - POST: Criar recurso (Income)
 * - GET: Ler recursos
 * 
 * Fluxo HTTP:
 * 1. Cliente envia requisição HTTP
 * 2. Controller extrai dados (body, params, user do JWT)
 * 3. Controller chama FinancesService
 * 4. FinancesService realiza operação
 * 5. Controller retorna resultado (JSON)
 * 
 * Autenticação:
 * - Todos endpoints requerem JWT token válido
 * - Token é extraído do header Authorization
 * - req.user contém: userId, email, roles, churchId
 */
@UseGuards(JwtAuthGuard, ChurchScopeGuard)
@Controller('finances')
export class FinancesController {
  constructor(
    private financesService: FinancesService,
    private expenseService: ExpenseService,
    private movementService: FinancialMovementService,
  ) {}

  /**
   * REGISTAR ENTRADA - POST /finances/income
   * 
   * Body esperado:
   * {
   *   "fundId": "uuid...",
   *   "type": "DIZIMO",
   *   "amount": 5000,
   *   "date": "2024-01-15",
   *   "observations": "Dízimo de João Silva"
   * }
   * 
   * Resposta (201 Created):
   * {
   *   "id": "uuid...",
   *   "churchId": "uuid...",
   *   "fundId": "uuid...",
   *   "recordedBy": "uuid...",
   *   "type": "DIZIMO",
   *   "amount": "5000.00",
   *   "date": "2024-01-15",
   *   "observations": "Dízimo de João Silva",
   *   "createdAt": "2024-01-15T10:30:00Z"
   * }
   * 
   * Fluxo:
   * 1. Extrair dados do body
   * 2. Extrair userId e churchId do JWT (req.user)
   * 3. Chamar FinancesService.recordIncome()
   * 4. Retornar Income criada
   * 5. Frontend/Cliente chama AuditService para registar (no backend)
   * 
   * TODO: Adicionar validações
   * - @IsUUID() para fundId
   * - @IsEnum() para type
   * - @IsNumber() para amount
   * - @IsDate() para date
   */
  @Post('income')
  async recordIncome(
    @Body()
    data: {
      fundId: string;
      type: IncomeType;
      amount: number;
      date: Date;
      observations?: string;
      attachments?: string;
      paymentMethod?: PaymentMethod;
    },
    @Req() req: any,
  ) {
    const churchId = this.resolveChurchId(req);
    const recordedBy = this.resolveUserId(req);
    // Chamar serviço para registar entrada
    // Passa churchId e userId do JWT para auditoria
    return this.financesService.recordIncome({
      ...data,
      churchId,
      recordedBy,
    });
  }

  @Get('funds')
  async listFunds(@Req() req: any) {
    const churchId = this.resolveChurchId(req);
    if (!churchId) {
      throw new BadRequestException('Necessário indicar uma igreja para listar fundos');
    }
    return this.financesService.listActiveFunds(churchId);
  }

  @Post('funds/init-missing')
  async initMissingFunds(@Req() req: any) {
    /**
     * ENDPOINT ADMINISTRATIVO - Criar fundos faltantes para uma Igreja
     * 
     * Uso:
     * POST /finances/funds/init-missing?churchId=<id>
     * 
     * Apenas admin pode usar este endpoint
     * Cria os 10 fundos padrão se não existirem
     */
    const user = req.user as { roles?: string[] } | undefined;
    const isAdmin = user?.roles?.includes('ADMIN');
    
    if (!isAdmin) {
      throw new ForbiddenException('Apenas administradores podem inicializar fundos');
    }

    const churchId = this.resolveChurchId(req);
    return this.financesService.initMissingFunds(churchId);
  }

  @Post('revenues')
  async recordRevenue(
    @Body()
    body: {
      type: RevenueType;
      totalAmount: number;
      paymentMethod: PaymentMethod;
      notes?: string;
      attachments?: string[];
      worship: {
        type: WorshipType;
        weekday: Weekday;
        serviceDate: string;
        location?: string;
        observations?: string;
      };
      distribution: Array<{ fundId: string; amount: number }>;
    },
    @Req() req: any,
  ) {
    const churchId = this.resolveChurchId(req);
    const recordedBy = this.resolveUserId(req);
    return this.financesService.recordRevenue({
      churchId,
      recordedBy,
      type: body.type,
      totalAmount: Number(body.totalAmount),
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      attachments: body.attachments,
      worship: {
        type: body.worship.type,
        weekday: body.worship.weekday,
        serviceDate: new Date(body.worship.serviceDate),
        location: body.worship.location,
        observations: body.worship.observations,
      },
      distribution: body.distribution.map((item) => ({
        fundId: item.fundId,
        amount: Number(item.amount),
      })),
    });
  }

  @Get('revenues')
  async getRevenues(@Req() req: any) {
    const churchId = this.resolveChurchId(req);
    return this.financesService.getRevenuesByChurch(churchId);
  }

  @Get('revenues/daily')
  async getDailyRevenues(
    @Query('date') date: string,
    @Req() req: any,
  ) {
    const churchId = this.resolveChurchId(req);
    const formatted = date ?? new Date().toLocaleDateString('en-CA');
    return this.financesService.getDailyRevenues(churchId, formatted);
  }

  /**
   * OBTER SALDO DO FUNDO - GET /finances/fund/{id}/balance
   * 
   * Path param:
   * - id: UUID do fundo
   * 
   * Resposta:
   * {
   *   "id": "uuid...",
   *   "churchId": "uuid...",
   *   "type": "FUNDO_GERAL",
   *   "balance": "125000.00",
   *   "description": "Fundo geral da igreja",
   *   "isActive": true,
   *   "createdAt": "2023-01-01T00:00:00Z",
   *   "updatedAt": "2024-01-15T10:30:00Z"
   * }
   * 
   * Uso:
   * const fund = await GET /finances/fund/abc-123/balance
   * console.log(`Saldo: ${fund.balance} MT`);
   */
  @Get('fund/:id/balance')
  async getFundBalance(@Param('id') fundId: string, @Req() req: any) {
    const churchId = this.resolveChurchId(req);
    return this.financesService.getFundBalance(fundId, churchId);
  }

  /**
   * LISTAR ENTRADAS DA IGREJA - GET /finances/income/church
   * 
   * Query params (opcionais):
   * - limit: Número de resultados (padrão: 100)
   * - offset: Começar a partir de (padrão: 0)
   * - startDate: Filtrar a partir de data
   * - endDate: Filtrar até data
   * - type: Filtrar por tipo (DIZIMO, OFERTA, etc)
   * 
   * Resposta:
   * [
   *   {
   *     "id": "uuid...",
   *     "fundId": "uuid...",
   *     "type": "DIZIMO",
   *     "amount": "5000.00",
   *     "date": "2024-01-15",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   },
   *   ...
   * ]
   * 
   * Fluxo:
   * 1. Extrair churchId do JWT
   * 2. Chamar FinancesService.getIncomeByChurch(churchId)
   * 3. Retornar array de entradas
   * 
   * TODO: Implementar pagination
   * TODO: Implementar filtros por tipo/data
   */
  @Get('income/church')
  async getIncomeByChurch(@Req() req: any) {
    const churchId = this.resolveChurchId(req);
    return this.financesService.getIncomeByChurch(churchId);
  }

  /**
   * LISTAR ENTRADAS DO FUNDO - GET /finances/income/fund/{id}
   * 
   * Path param:
   * - id: UUID do fundo
   * 
   * Resposta:
   * Array de Income entities do fundo
   * 
   * Uso típico:
   * GET /finances/income/fund/abc-123
   * Retorna todas as entradas do fundo abc-123
   * 
   * TODO: Adicionar filtros por período
   * TODO: Calcular total de entradas
   */
  @Get('income/fund/:id')
  async getIncomeByFund(@Param('id') fundId: string, @Req() req: any) {
    const churchId = this.resolveChurchId(req);
    return this.financesService.getIncomeByFund(fundId, churchId);
  }

  /**
   * LISTAR DESPESAS - GET /finances/expenses
   * 
   * Query params (opcionais):
   * - limit: Número de resultados (padrão: 100)
   * - offset: Começar a partir de (padrão: 0)
   * 
   * Resposta:
   * Array de Despesa entities ordenadas por data (mais recentes primeiro)
   * 
   * Uso:
   * GET /finances/expenses
   * Retorna todas as despesas da igreja com paginação
   */
  @Get('expenses')
  async getExpenses(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('fundId') fundId?: string,
    @Query('executorId') executorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const churchId = this.resolveChurchId(req);
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const min = minAmount ? Number(minAmount) : undefined;
    const max = maxAmount ? Number(maxAmount) : undefined;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const [expenses, total] = await this.expenseService.getExpensesFiltered({
      churchId,
      fundId,
      executorId,
      startDate: start,
      endDate: end,
      minAmount: min,
      maxAmount: max,
      search,
      limit: limitNum,
      offset: offsetNum,
    });

    return {
      data: expenses,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * LISTAR MOVIMENTOS - GET /finances/movements
   * 
   * Query params:
   * - fundId: ID do fundo (opcional, mostra movimentos do fundo)
   * - startDate: Data início (opcional)
   * - endDate: Data fim (opcional)
   * 
   * Resposta:
   * Array de MovimentoFinanceiro
   */
  @Get('movements')
  async getMovements(
    @Query('fundId') fundId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('tipo') tipo?: 'ENTRADA' | 'SAIDA' | 'AJUSTE',
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    const churchId = this.resolveChurchId(req);
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const min = minAmount ? Number(minAmount) : undefined;
    const max = maxAmount ? Number(maxAmount) : undefined;

    const [movements, total] = await this.movementService.getMovementsFiltered({
      churchId,
      fundId,
      startDate: start,
      endDate: end,
      tipo,
      minAmount: min,
      maxAmount: max,
      search,
      limit: limitNum,
      offset: offsetNum,
    });

    return {
      data: movements,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  private resolveChurchId(req: any): string {
    // Tentar obter churchId por ordem de prioridade
    const churchId = 
      req.query?.churchId ||              // Query param (frontend pode passar explicitamente)
      req.user?.churchId ||               // JWT payload
      req.churchId ||                     // ChurchScopeGuard set
      req.body?.churchId;                 // Body (última opção)
    
    if (!churchId) {
      throw new BadRequestException('Necessário indicar Igreja (churchId ausente no JWT ou query)');
    }
    return churchId;
  }

  private resolveUserId(req: any): string {
    return req.user?.userId || req.user?.sub;
  }
}
