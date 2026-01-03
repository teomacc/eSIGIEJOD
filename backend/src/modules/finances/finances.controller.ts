import { Controller, Post, Get, Param, Body, Req } from '@nestjs/common';
import { FinancesService } from './finances.service';
import { IncomeType } from './entities/income.entity';

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
@Controller('finances')
export class FinancesController {
  constructor(
    private financesService: FinancesService,
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
    },
    @Req() req: any,
  ) {
    // Chamar serviço para registar entrada
    // Passa churchId e userId do JWT para auditoria
    return this.financesService.recordIncome({
      ...data,
      churchId: req.user.churchId, // Do JWT
      recordedBy: req.user.userId, // Do JWT
    });
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
  async getFundBalance(@Param('id') fundId: string) {
    return this.financesService.getFundBalance(fundId);
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
    return this.financesService.getIncomeByChurch(req.user.churchId);
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
  async getIncomeByFund(@Param('id') fundId: string) {
    return this.financesService.getIncomeByFund(fundId);
  }
}
