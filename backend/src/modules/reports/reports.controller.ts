import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

/**
 * CONTROLADOR DE RELATÓRIOS (ReportsController)
 * 
 * Responsabilidade: Gerir endpoints para geração de relatórios
 * 
 * Endpoints:
 * - GET /reports/monthly - Relatório mensal
 * - GET /reports/general - Relatório geral (período customizado)
 * - GET /reports/fund/{fundId} - Análise de fundo
 * - GET /reports/requisitions - Análise de requisições
 * - GET /reports/compliance - Relatório de compliance
 * - GET /reports/anomalies - Detecção de anomalias
 * 
 * Autenticação:
 * - Todos endpoints requerem JWT válido
 * - Usuário pode ver apenas dados da sua iglesia
 * 
 * Autorização:
 * - AUDITOR: Pode ver todos os relatórios
 * - DIRECTOR: Pode ver relatórios financeiros
 * - TREASURER: Pode ver relatórios financeiros e requisições
 * - PASTOR: Acesso total
 * 
 * Fluxo:
 * 1. Client envia GET request com query params
 * 2. AuthGuard valida JWT
 * 3. Controller extrai parâmetros e churchId
 * 4. Controller chama ReportsService
 * 5. Service consulta BD e agrega dados
 * 6. Service registra em AuditLog (REPORT_GENERATED)
 * 7. Controller retorna relatório (JSON)
 */
@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  /**
   * RELATÓRIO MENSAL - GET /reports/monthly
   * 
   * Query params:
   * - year: Ano (ex: 2024)
   * - month: Mês (1-12)
   * 
   * Resposta (200 OK):
   * {
   *   "type": "monthly",
   *   "period": {
   *     "startDate": "2024-01-01T00:00:00Z",
   *     "endDate": "2024-01-31T23:59:59Z"
   *   },
   *   "summary": {
   *     "totalIncome": 250000,
   *     "incomeCount": 45,
   *     "incomeByType": {
   *       "TITHE": 150000,
   *       "OFFERING": 80000,
   *       "DONATION": 20000
   *     },
   *     "incomeByFund": {
   *       "GENERAL": 200000,
   *       "CONSTRUCTION": 50000
   *     },
   *     "averageTransaction": 5555.56
   *   },
   *   "requisitions": {
   *     "created": 12,
   *     "approved": 8,
   *     "rejected": 2,
   *     "totalApproved": 85000
   *   }
   * }
   * 
   * Fluxo:
   * 1. Extrair year e month dos query params
   * 2. Chamar ReportsService.generateMonthlyReport()
   * 3. Serviço agrega dados de 3 fontes:
   *    - Income: Receitas do mês
   *    - Fund: Balanços
   *    - Requisition: Requisições do mês
   * 4. Serviço registra em AuditLog
   * 5. Retornar relatório
   * 
   * Exemplo:
   * GET /reports/monthly?year=2024&month=1
   * Retorna relatório de janeiro/2024
   * 
   * Usado para:
   * - Dashboard mensal
   * - Relatório ao conselho
   * - Email de síntese
   */
  @Get('monthly')
  async getMonthlyReport(
    @Query('year') year: number,
    @Query('month') month: number,
    @Req() req: any,
  ) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;

    return this.reportsService.generateMonthlyReport(
      churchId,
      userId,
      year,
      month,
    );
  }

  /**
   * RELATÓRIO GERAL - GET /reports/general
   * 
   * Query params:
   * - startDate: Data início (formato: YYYY-MM-DD)
   * - endDate: Data fim (formato: YYYY-MM-DD)
   * 
   * Resposta (200 OK):
   * Estrutura similar ao relatório mensal, mas para período customizado
   * 
   * Exemplo:
   * GET /reports/general?startDate=2024-01-01&endDate=2024-03-31
   * Retorna relatório de janeiro a março
   * 
   * Usado para:
   * - Análise de trimestre
   * - Análise de semestre
   * - Período customizado
   */
  @Get('general')
  async getGeneralReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;

    return this.reportsService.generateGeneralReport(
      churchId,
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * RELATÓRIO DE FUNDO - GET /reports/fund/{fundId}
   * 
   * Path param:
   * - fundId: ID do fundo
   * 
   * Resposta (200 OK):
   * {
   *   "type": "fund",
   *   "fundId": "uuid",
   *   "fundName": "GERAL",
   *   "balance": 500000,
   *   "summary": {
   *     "totalIncome": 2500000,
   *     "transactionCount": 150
   *   }
   * }
   * 
   * Fluxo:
   * 1. Extrair fundId do URL
   * 2. Chamar ReportsService.generateFundReport()
   * 3. Serviço:
   *    - Valida que fundo existe
   *    - Busca balanço atual
   *    - Agrega todas as receitas do fundo
   *    - Calcula média de transação
   * 4. Retornar
   * 
   * Exemplo:
   * GET /reports/fund/abc-123-fund-id
   * 
   * Usado para:
   * - Análise de fundo específico
   * - Histórico de fundo
   * - Comparação de fundos
   */
  @Get('fund/:fundId')
  async getFundReport(
    @Req() req: any,
  ) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;
    const fundId = req.params.fundId;

    return this.reportsService.generateFundReport(
      churchId,
      userId,
      fundId,
    );
  }

  /**
   * RELATÓRIO DE REQUISIÇÕES - GET /reports/requisitions
   * 
   * Retorna análise de requisições:
   * - Quantidade por estado
   * - Quantidade por categoria
   * - Montante por categoria
   * 
   * Resposta (200 OK):
   * {
   *   "type": "requisition",
   *   "summary": {
   *     "byState": {
   *       "PENDING": 5,
   *       "UNDER_REVIEW": 3,
   *       "APPROVED": 20,
   *       "REJECTED": 2,
   *       "EXECUTED": 45,
   *       "CANCELLED": 1
   *     },
   *     "byCategory": {
   *       "MATERIALS": {
   *         "count": 15,
   *         "total": 75000
   *       },
   *       "PERSONNEL": {
   *         "count": 10,
   *         "total": 250000
   *       }
   *     }
   *   }
   * }
   * 
   * Fluxo:
   * 1. Chamar ReportsService.generateRequisitionReport()
   * 2. Serviço agrega requisições por:
   *    - Estado (PENDING, APPROVED, etc)
   *    - Categoria (MATERIALS, PERSONNEL, etc)
   * 3. Calcular montantes
   * 4. Retornar
   * 
   * Exemplo:
   * GET /reports/requisitions
   * 
   * Usado para:
   * - Dashboard de requisições
   * - Análise de padrões de gasto
   * - Identificar gargalos de aprovação
   */
  @Get('requisitions')
  async getRequisitionReport(@Req() req: any) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;

    return this.reportsService.generateRequisitionReport(
      churchId,
      userId,
    );
  }

  /**
   * RELATÓRIO DE COMPLIANCE - GET /reports/compliance
   * 
   * Query params:
   * - startDate: Data início (formato: YYYY-MM-DD)
   * - endDate: Data fim (formato: YYYY-MM-DD)
   * 
   * Resposta (200 OK):
   * {
   *   "type": "compliance",
   *   "period": {
   *     "startDate": "2024-01-01T00:00:00Z",
   *     "endDate": "2024-01-31T23:59:59Z"
   *   },
   *   "summary": {
   *     "totalActions": 1250,
   *     "byAction": {
   *       "INCOME_RECORDED": 150,
   *       "REQUISITION_CREATED": 50,
   *       "REQUISITION_APPROVED": 40,
   *       "USER_LOGIN": 800,
   *       ...
   *     },
   *     "byUser": {
   *       "userId1": 300,
   *       "userId2": 250,
   *       "userId3": 200,
   *       ...
   *     }
   *   }
   * }
   * 
   * Fluxo:
   * 1. Extrair datas
   * 2. Chamar ReportsService.generateComplianceReport()
   * 3. Serviço consulta AuditLog:
   *    - Conta ações por tipo
   *    - Conta ações por usuário
   *    - Período especificado
   * 4. Retornar
   * 
   * Exemplo:
   * GET /reports/compliance?startDate=2024-01-01&endDate=2024-01-31
   * 
   * Usado para:
   * - Auditoria de período
   * - Rastreamento de atividade
   * - Compliance reporting
   * - Investigações
   */
  @Get('compliance')
  async getComplianceReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;

    return this.reportsService.generateComplianceReport(
      churchId,
      userId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * DETECÇÃO DE ANOMALIAS - GET /reports/anomalies
   * 
   * Retorna possíveis anomalias ou padrões suspeitos
   * 
   * Resposta (200 OK):
   * {
   *   "anomalies": [
   *     {
   *       "type": "large_transaction",
   *       "description": "Transação 3x maior que média",
   *       "severity": "medium",
   *       "data": {
   *         "date": "2024-01-15",
   *         "amount": 500000,
   *         "average": 150000
   *       }
   *     },
   *     {
   *       "type": "unusual_time",
   *       "description": "Transação fora do horário comercial",
   *       "severity": "low",
   *       "data": {
   *         "date": "2024-01-14T23:45:00Z",
   *         "time": "23:45"
   *       }
   *     }
   *   ]
   * }
   * 
   * Severidade:
   * - low: Informativo, provavelmente normal
   * - medium: Verificar, pode ser legítimo
   * - high: Investigar imediatamente
   * 
   * Fluxo:
   * 1. Chamar ReportsService.detectAnomalies()
   * 2. Serviço executa análise:
   *    - Análise estatística
   *    - Detecção de outliers
   *    - Machine Learning (futuro)
   * 3. Retornar anomalias encontradas
   * 
   * Exemplo:
   * GET /reports/anomalies
   * 
   * TODO:
   * - Implementar detecção estatística
   * - Integrar Machine Learning
   * - Calibrar thresholds
   * 
   * Usado para:
   * - Detecção de fraude
   * - Qualidade de dados
   * - Compliance monitoramento
   */
  @Get('anomalies')
  async detectAnomalies(@Req() req: any) {
    const churchId = req.user.churchId;
    const userId = req.user.sub;

    return this.reportsService.detectAnomalies(churchId, userId);
  }
}
