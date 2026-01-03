import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from '../audit/entities/audit-log.entity';
import { Income } from '../finances/entities/income.entity';
import { Fund } from '../finances/entities/fund.entity';
import { Requisition, RequisitionState } from '../requisitions/entities/requisition.entity';
import { AuditService } from '../audit/audit.service';

/**
 * SERVIÇO DE RELATÓRIOS (ReportsService)
 * 
 * Responsabilidade: Gerar relatórios e analytics de negócio
 * 
 * Métodos Principais:
 * 1. generateMonthlyReport() - Receita do mês
 * 2. generateGeneralReport() - Visão geral (período)
 * 3. generateFundReport() - Análise de fundo
 * 4. generateRequisitionReport() - Análise de requisições
 * 5. generateComplianceReport() - Auditoria e compliance
 * 6. detectAnomalies() - Detecção de padrões anormais
 * 
 * Estrutura de Relatório:
 * {
 *   type: string,           // "monthly" | "general" | "fund" | etc
 *   generatedAt: Date,      // Quando foi gerado
 *   churchId: string,       // Que iglesia
 *   period: {
 *     startDate: Date,
 *     endDate: Date
 *   },
 *   summary: { ... },       // Dados agregados
 *   details: { ... },       // Detalhes
 *   metadata: {
 *     generatedBy: string,  // usuário ID
 *     executionTime: number // ms
 *   }
 * }
 * 
 * Performance:
 * - Todas queries usam índices existentes
 * - Agregação em nível de BD
 * - Sem N+1 queries
 */
@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
    private auditService: AuditService,
  ) {}

  /**
   * RELATÓRIO MENSAL - generateMonthlyReport()
   * 
   * Entrada:
   * {
   *   churchId: string,
   *   year: number (ex: 2024),
   *   month: number (1-12, ex: 1 para janeiro)
   * }
   * 
   * Retorna:
   * {
   *   type: "monthly",
   *   period: { startDate: "2024-01-01", endDate: "2024-01-31" },
   *   summary: {
   *     totalIncome: 250000,
   *     incomeCount: 45,
   *     incomeByType: {
   *       TITHE: 150000,
   *       OFFERING: 80000,
   *       DONATION: 20000
   *     },
   *     incomeByFund: {
   *       GENERAL: 200000,
   *       CONSTRUCTION: 50000
   *     },
   *     averageTransaction: 5555.56
   *   },
   *   requisitions: {
   *     created: 12,
   *     approved: 8,
   *     rejected: 2,
   *     totalApproved: 85000
   *   }
   * }
   * 
   * Fluxo:
   * 1. Calcular período (primeiro até último dia do mês)
   * 2. Agregação de Income por período
   * 3. Agregação por IncomeType
   * 4. Agregação por Fund
   * 5. Agregação de Requisitions
   * 6. Registrar auditoria (REPORT_GENERATED)
   * 7. Retornar relatório
   * 
   * Usado para:
   * - Dashboard mensal
   * - Relatórios ao conselho
   * - Análise de tendências
   */
  async generateMonthlyReport(
    churchId: string,
    userId: string,
    year: number,
    month: number,
  ): Promise<{
    type: string;
    period: { startDate: Date; endDate: Date };
    summary: {
      totalIncome: number;
      incomeCount: number;
      incomeByType: Record<string, number>;
      incomeByFund: Record<string, number>;
      averageTransaction: number;
    };
    requisitions: {
      created: number;
      approved: number;
      rejected: number;
      totalApproved: number;
    };
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Query: Agregação de Income
    const incomeQuery = this.incomeRepository
      .createQueryBuilder('income')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(income.amount)', 'total')
      .where('income.churchId = :churchId', { churchId })
      .andWhere('income.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const incomeAgg = await incomeQuery.getRawOne();

    // Query: Income por tipo
    const incomeByTypeQuery = this.incomeRepository
      .createQueryBuilder('income')
      .select('income.type', 'type')
      .addSelect('SUM(income.amount)', 'total')
      .where('income.churchId = :churchId', { churchId })
      .andWhere('income.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('income.type');

    const incomeByType = await incomeByTypeQuery.getRawMany();

    // Query: Income por fundo
    const incomeByFundQuery = this.fundRepository
      .createQueryBuilder('fund')
      .select('fund.name', 'fundName')
      .addSelect('SUM(income.amount)', 'total')
      .leftJoin('income', 'income', 'income.fundId = fund.id')
      .where('fund.churchId = :churchId', { churchId })
      .andWhere('income.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('fund.id');

    const incomeByFund = await incomeByFundQuery.getRawMany();

    // Query: Requisições do período
    const requisitionsQuery = this.requisitionRepository
      .createQueryBuilder('req')
      .where('req.churchId = :churchId', { churchId })
      .andWhere('req.requestedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const requisitions = await requisitionsQuery.getMany();

    // Calcular agregações de requisições
    const reqStats = {
      created: requisitions.length,
      approved: requisitions.filter(
        (r) => r.state === RequisitionState.APPROVED,
      ).length,
      rejected: requisitions.filter(
        (r) => r.state === RequisitionState.REJECTED,
      ).length,
      totalApproved: requisitions
        .filter((r) => r.state === RequisitionState.APPROVED)
        .reduce((sum, r) => sum + (r.approvedAmount || 0), 0),
    };

    // Registrar auditoria
    await this.auditService.logAction({
      churchId,
      userId,
      action: AuditAction.REPORT_GENERATED,
      entityId: `monthly-${year}-${month}`,
      entityType: 'Report',
      changes: {
        before: null,
        after: { type: 'monthly', year, month },
      },
      description: `Relatório mensal gerado para ${month}/${year}`,
    });

    return {
      type: 'monthly',
      period: { startDate, endDate },
      summary: {
        totalIncome: parseInt(incomeAgg?.total || 0),
        incomeCount: parseInt(incomeAgg?.count || 0),
        incomeByType: incomeByType.reduce(
          (acc, row) => {
            acc[row.type] = parseInt(row.total || 0);
            return acc;
          },
          {} as Record<string, number>,
        ),
        incomeByFund: incomeByFund.reduce(
          (acc, row) => {
            acc[row.fundName] = parseInt(row.total || 0);
            return acc;
          },
          {} as Record<string, number>,
        ),
        averageTransaction:
          incomeAgg?.count > 0
            ? parseInt(incomeAgg?.total || 0) / parseInt(incomeAgg?.count)
            : 0,
      },
      requisitions: reqStats,
    };
  }

  /**
   * RELATÓRIO GERAL - generateGeneralReport()
   * 
   * Retorna visão geral de um período (pode ser semestre, ano, etc)
   * 
   * Entrada:
   * {
   *   churchId: string,
   *   startDate: Date,
   *   endDate: Date
   * }
   * 
   * Retorna:
   * Estrutura similar ao monthly, mas agregado todo o período
   */
  async generateGeneralReport(
    churchId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Implementação similar ao monthly
    // Mas para período customizado
    const incomeQuery = this.incomeRepository
      .createQueryBuilder('income')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(income.amount)', 'total')
      .where('income.churchId = :churchId', { churchId })
      .andWhere('income.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const result = await incomeQuery.getRawOne();

    // Log auditoria
    await this.auditService.logAction({
      churchId,
      userId,
      action: AuditAction.REPORT_GENERATED,
      entityId: `general-${startDate.getTime()}`,
      entityType: 'Report',
      changes: {
        before: null,
        after: { type: 'general', startDate, endDate },
      },
      description: `Relatório geral gerado`,
    });

    return {
      type: 'general',
      period: { startDate, endDate },
      summary: {
        totalIncome: parseInt(result?.total || 0),
        transactionCount: parseInt(result?.count || 0),
      },
    };
  }

  /**
   * RELATÓRIO DE FUNDO - generateFundReport()
   * 
   * Análise detalhada de um fundo específico
   * 
   * Retorna:
   * - Balanço atual
   * - Entradas por período
   * - Saídas por período
   * - Histórico mensal
   */
  async generateFundReport(
    churchId: string,
    userId: string,
    fundId: string,
  ): Promise<any> {
    // Buscar fundo
    const fund = await this.fundRepository.findOne({
      where: { id: fundId, churchId },
    });

    if (!fund) {
      return { error: 'Fundo não encontrado' };
    }

    // Agregação de income neste fundo
    const incomeQuery = this.incomeRepository
      .createQueryBuilder('income')
      .select('COUNT(*)', 'count')
      .addSelect('SUM(income.amount)', 'total')
      .where('income.fundId = :fundId', { fundId });

    const incomeData = await incomeQuery.getRawOne();

    return {
      type: 'fund',
      fundId,
      fundType: fund.type,
      balance: fund.balance,
      summary: {
        totalIncome: parseInt(incomeData?.total || 0),
        transactionCount: parseInt(incomeData?.count || 0),
      },
    };
  }

  /**
   * RELATÓRIO DE REQUISIÇÕES - generateRequisitionReport()
   * 
   * Análise de padrões de requisições
   * - Por categoria
   * - Por aprovador
   * - Por período de aprovação
   */
  async generateRequisitionReport(
    churchId: string,
    userId: string,
  ): Promise<any> {
    // Requisições por estado
    const byState = await this.requisitionRepository
      .createQueryBuilder('req')
      .select('req.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .where('req.churchId = :churchId', { churchId })
      .groupBy('req.state')
      .getRawMany();

    // Requisições por categoria
    const byCategory = await this.requisitionRepository
      .createQueryBuilder('req')
      .select('req.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(req.requestedAmount)', 'total')
      .where('req.churchId = :churchId', { churchId })
      .groupBy('req.category')
      .getRawMany();

    return {
      type: 'requisition',
      summary: {
        byState: byState.reduce(
          (acc, row) => {
            acc[row.state] = parseInt(row.count);
            return acc;
          },
          {},
        ),
        byCategory: byCategory.reduce(
          (acc, row) => {
            acc[row.category] = {
              count: parseInt(row.count),
              total: parseInt(row.total || 0),
            };
            return acc;
          },
          {},
        ),
      },
    };
  }

  /**
   * RELATÓRIO DE COMPLIANCE - generateComplianceReport()
   * 
   * Análise de auditoria e conformidade
   * - Ações por usuário
   * - Ações por tipo
   * - Mutações de dados
   * - Score de conformidade
   */
  async generateComplianceReport(
    churchId: string,
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    // Ações por tipo
    const byAction = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.action', 'action')
      .addSelect('COUNT(*)', 'count')
      .where('audit.churchId = :churchId', { churchId })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('audit.action')
      .getRawMany();

    // Ações por usuário
    const byUser = await this.auditLogRepository
      .createQueryBuilder('audit')
      .select('audit.userId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('audit.churchId = :churchId', { churchId })
      .andWhere('audit.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('audit.userId')
      .getRawMany();

    return {
      type: 'compliance',
      period: { startDate, endDate },
      summary: {
        totalActions: byAction.reduce(
          (sum, row) => sum + parseInt(row.count),
          0,
        ),
        byAction: byAction.reduce(
          (acc, row) => {
            acc[row.action] = parseInt(row.count);
            return acc;
          },
          {},
        ),
        byUser: byUser.reduce(
          (acc, row) => {
            acc[row.userId] = parseInt(row.count);
            return acc;
          },
          {},
        ),
      },
    };
  }

  /**
   * DETECÇÃO DE ANOMALIAS - detectAnomalies()
   * 
   * Procura por padrões anormais que podem indicar:
   * - Fraude
   * - Erro de dados
   * - Padrões incomuns
   * 
   * TODO: Implementar algoritmo de detecção
   * - Statistical analysis
   * - Machine Learning (futuro)
   * 
   * Possíveis anomalias:
   * - Transação muito grande (outlier)
   * - Múltiplas transações em pouco tempo
   * - Atividade fora do horário comercial
   * - Padrão de gastos incomum
   */
  async detectAnomalies(
    churchId: string,
    userId: string,
  ): Promise<{
    anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      data: any;
    }>;
  }> {
    const anomalies: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      data: any;
    }> = [];

    // TODO: Implementar detecção de anomalias
    // Por enquanto, retornar array vazio
    // Implementação futura com ML

    // Log auditoria
    await this.auditService.logAction({
      churchId,
      userId,
      action: AuditAction.REPORT_GENERATED,
      entityId: `anomalies-${Date.now()}`,
      entityType: 'Report',
      changes: {
        before: null,
        after: { type: 'anomalies' },
      },
      description: 'Análise de anomalias executada',
    });

    return { anomalies };
  }
}
