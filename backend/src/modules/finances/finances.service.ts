import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Income, IncomeType } from './entities/income.entity';
import { Fund, FundType } from './entities/fund.entity';
import { Worship, WorshipType, Weekday } from './entities/worship.entity';
import { Revenue, RevenueType, PaymentMethod } from './entities/revenue.entity';
import { RevenueFund } from './entities/revenue-fund.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

/**
 * SERVIÇO DE FINANÇAS (FinancesService)
 * 
 * Responsabilidade: Gerir lógica de negócio para entradas e fundos
 * 
 * Princípios:
 * - IMUTABILIDADE: Entradas nunca são deletadas
 * - INTEGRIDADE: Saldo do fundo sempre em sync com entradas
 * - AUDITORIA: Todas as operações devem ser registadas
 * 
 * Métodos principais:
 * 1. recordIncome() - Registar nova entrada (imutável)
 * 2. getFundBalance() - Obter saldo atual do fundo
 * 3. getIncomeByChurch() - Listar todas as entradas de uma igreja
 * 4. getIncomeByFund() - Listar entradas de um fundo específico
 * 
 * Fluxo de Registar Renda:
 * 1. Receber dados (churchId, fundId, type, amount, date)
 * 2. Criar Income entity
 * 3. Salvar Income no BD (cria registro imutável)
 * 4. Atualizar Fund.balance incrementando com amount
 * 5. Retornar Income criada
 * 6. Controller chama AuditService para registar ação
 */
@Injectable()
export class FinancesService {
  constructor(
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(Worship)
    private worshipRepository: Repository<Worship>,
    @InjectRepository(Revenue)
    private revenueRepository: Repository<Revenue>,
    @InjectRepository(RevenueFund)
    private revenueFundRepository: Repository<RevenueFund>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private normalizeAmount(value: number | string): number {
    return Number(value);
  }

  private amountsMatch(total: number, sum: number): boolean {
    return Math.abs(Number(total) - Number(sum)) < 0.01;
  }

  private mapRevenueTypeToIncomeType(type: RevenueType): IncomeType {
    switch (type) {
      case RevenueType.TITHE:
        return IncomeType.TITHE;
      case RevenueType.SPECIAL_CONTRIBUTION:
        return IncomeType.SPECIAL_CONTRIBUTION;
      case RevenueType.MISSIONARY_OFFERING:
        return IncomeType.MISSIONARY_OFFERING;
      case RevenueType.CONSTRUCTION_OFFERING:
        return IncomeType.CONSTRUCTION_OFFERING;
      case RevenueType.EXTERNAL_DONATION:
        return IncomeType.EXTERNAL_DONATION;
      case RevenueType.SPECIAL_CAMPAIGN:
        return IncomeType.SPECIAL_CAMPAIGN;
      case RevenueType.TAFULA:
        return IncomeType.TAFULA;
      default:
        return IncomeType.OFFERING;
    }
  }

  async listActiveFunds(churchId: string): Promise<Fund[]> {
    return this.fundRepository.find({
      where: { churchId, isActive: true },
      order: { type: 'ASC' },
    });
  }

  async initMissingFunds(churchId: string): Promise<{ created: number; skipped: number }> {
    /**
     * INICIALIZAR FUNDOS FALTANTES
     * 
     * Para igrejas que foram criadas antes da mudança de código,
     * este método cria os 10 fundos padrão se não existirem
     */
    const fundTypes = [
      FundType.GENERAL,
      FundType.CONSTRUCTION,
      FundType.MISSIONS,
      FundType.SOCIAL,
      FundType.EVENTS,
      FundType.EMERGENCY,
      FundType.SPECIAL_PROJECTS,
      FundType.YOUTH,
      FundType.WOMEN,
      FundType.MAINTENANCE,
    ];

    const mapping: Record<string, string> = {
      [FundType.GENERAL]: 'Fundo Geral',
      [FundType.CONSTRUCTION]: 'Fundo de Construção',
      [FundType.MISSIONS]: 'Fundo de Missões',
      [FundType.SOCIAL]: 'Fundo Social',
      [FundType.EVENTS]: 'Fundo de Eventos',
      [FundType.EMERGENCY]: 'Fundo de Emergência',
      [FundType.SPECIAL_PROJECTS]: 'Fundo de Projectos Especiais',
      [FundType.YOUTH]: 'Fundo da Juventude',
      [FundType.WOMEN]: 'Fundo das Mulheres',
      [FundType.MAINTENANCE]: 'Fundo de Manutenção',
    };

    let created = 0;
    let skipped = 0;

    for (const fundType of fundTypes) {
      const exists = await this.fundRepository.findOne({
        where: { churchId, type: fundType },
      });

      if (!exists) {
        await this.fundRepository.save({
          churchId,
          type: fundType,
          balance: 0,
          isActive: true,
          description: mapping[fundType] || fundType,
        });
        created++;
      } else {
        skipped++;
      }
    }

    return { created, skipped };
  }

  async getDailyRevenues(churchId: string, serviceDate: string): Promise<Revenue[]> {
    return this.revenueRepository
      .createQueryBuilder('revenue')
      .leftJoinAndSelect('revenue.allocations', 'allocation')
      .leftJoinAndSelect('allocation.fund', 'fund')
      .leftJoinAndSelect('revenue.worship', 'worship')
      .where('revenue.churchId = :churchId', { churchId })
      .andWhere('worship.serviceDate = :serviceDate', { serviceDate })
      .orderBy('revenue.createdAt', 'DESC')
      .getMany();
  }

  async getRevenuesByChurch(churchId: string): Promise<Revenue[]> {
    return this.revenueRepository
      .createQueryBuilder('revenue')
      .leftJoinAndSelect('revenue.allocations', 'allocation')
      .leftJoinAndSelect('allocation.fund', 'fund')
      .leftJoinAndSelect('revenue.worship', 'worship')
      .where('revenue.churchId = :churchId', { churchId })
      .orderBy('revenue.createdAt', 'DESC')
      .getMany();
  }

  async recordRevenue(data: {
    churchId: string;
    recordedBy: string;
    type: RevenueType;
    totalAmount: number;
    paymentMethod: PaymentMethod;
    notes?: string;
    attachments?: string[];
    worship: {
      type: WorshipType;
      weekday: Weekday;
      serviceDate: Date;
      location?: string;
      observations?: string;
    };
    distribution: Array<{ fundId: string; amount: number }>;
  }): Promise<Revenue> {
    if (!data.distribution?.length) {
      throw new BadRequestException('A distribuicao por fundos e obrigatoria');
    }

    const totalAmount = this.normalizeAmount(data.totalAmount);
    if (totalAmount <= 0) {
      throw new BadRequestException('O valor total deve ser maior que zero');
    }

    const distributionTotals = data.distribution.map((item) => ({
      fundId: item.fundId,
      amount: this.normalizeAmount(item.amount),
    }));

    distributionTotals.forEach((item) => {
      if (item.amount <= 0) {
        throw new BadRequestException('Os valores alocados devem ser maiores que zero');
      }
    });

    const distributedSum = distributionTotals.reduce((sum, item) => sum + item.amount, 0);

    if (!this.amountsMatch(totalAmount, distributedSum)) {
      throw new BadRequestException('Total distribuido deve ser igual ao valor total');
    }

    const uniqueFundIds = Array.from(new Set(distributionTotals.map((item) => item.fundId)));

    const funds = await this.fundRepository.find({
      where: {
        id: In(uniqueFundIds),
        churchId: data.churchId,
        isActive: true,
      },
    });

    if (funds.length !== uniqueFundIds.length) {
      throw new BadRequestException('Fundos invalidos na distribuicao');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const worshipRepo = manager.getRepository(Worship);
      const revenueRepo = manager.getRepository(Revenue);
      const revenueFundRepo = manager.getRepository(RevenueFund);
      const incomeRepo = manager.getRepository(Income);
      const fundRepo = manager.getRepository(Fund);

      const worship = worshipRepo.create({
        churchId: data.churchId,
        type: data.worship.type,
        weekday: data.worship.weekday,
        serviceDate: data.worship.serviceDate,
        location: data.worship.location,
        observations: data.worship.observations,
      });
      const savedWorship = await worshipRepo.save(worship) as Worship;

      const revenue = revenueRepo.create({
        churchId: data.churchId,
        recordedBy: data.recordedBy,
        type: data.type,
        totalAmount,
        paymentMethod: data.paymentMethod,
        worshipId: savedWorship.id,
        notes: data.notes,
        attachments: data.attachments,
      });
      const savedRevenue = await revenueRepo.save(revenue) as Revenue;

      const allocations = [] as RevenueFund[];
      const incomes = [] as Income[];

      for (const item of distributionTotals) {
        const allocation = revenueFundRepo.create({
          revenueId: savedRevenue.id,
          fundId: item.fundId,
          amount: item.amount,
        });
        const savedAllocation = await revenueFundRepo.save(allocation);
        allocations.push(savedAllocation);

        await fundRepo.increment({ id: item.fundId }, 'balance', item.amount);

        const income = incomeRepo.create({
          churchId: data.churchId,
          fundId: item.fundId,
          recordedBy: data.recordedBy,
          type: this.mapRevenueTypeToIncomeType(data.type),
          amount: item.amount,
          date: data.worship.serviceDate,
          observations: data.notes,
          attachments: data.attachments ? JSON.stringify(data.attachments) : undefined,
          revenueId: savedRevenue.id,
          worshipId: savedWorship.id,
          paymentMethod: data.paymentMethod,
        });
        incomes.push(income);
      }

      await incomeRepo.save(incomes);

      savedRevenue.allocations = allocations;
      savedRevenue.worship = savedWorship;

      return savedRevenue;
    }) as Promise<Revenue>;

    await this.auditService.logAction({
      churchId: data.churchId,
      userId: data.recordedBy,
      action: AuditAction.REVENUE_RECORDED,
      entityId: result.id,
      entityType: 'Revenue',
      changes: {
        type: result.type,
        paymentMethod: result.paymentMethod,
        totalAmount,
        distribution: result.allocations?.map((item: RevenueFund) => ({
          fundId: item.fundId,
          amount: item.amount,
        })),
      },
      description: 'Receita registada com distribuicao por fundos',
    });

    return result;
  }

  /**
   * REGISTAR ENTRADA - Cria registro imutável de dinheiro recebido
   * 
   * Parâmetros:
   * - churchId: ID da église (isolamento)
   * - fundId: ID do fundo que recebe dinheiro
   * - recordedBy: ID do usuário que registou
   * - type: Tipo de entrada (dízimo, oferta, etc)
   * - amount: Montante recebido
   * - date: Data da entrada
   * - observations: Notas opcionais
   * - attachments: Anexos opcionais
   * 
   * Fluxo:
   * 1. Criar Income entity com dados
   * 2. Salvar no BD (operação CREATE)
   * 3. Incrementar Fund.balance de forma atômica
   * 4. Retornar Income criada
   * 
   * Transação Atômica:
   * - Ambas operações (criar Income + atualizar Fund) devem suceder juntas
   * - Se uma falha, ambas são revertidas
   * - Garantir integridade de dados
   * 
   * TODO: Implementar transação usando @Transaction() decorator
   */
  async recordIncome(data: {
    churchId: string;
    fundId: string;
    recordedBy: string;
    type: IncomeType;
    amount: number;
    date: Date;
    observations?: string;
    attachments?: string;
    revenueId?: string;
    worshipId?: string;
    paymentMethod?: PaymentMethod;
  }): Promise<Income> {
    // 1. Criar Income entity (ainda não salva)
    const income = this.incomeRepository.create(data);

    // 2. Salvar Income no BD (operação CREATE imutável)
    const saved = await this.incomeRepository.save(income);

    // 3. Atualizar saldo do fundo
    // QueryBuilder.increment() é operação atômica
    // Incrementar Fund.balance pelo montante da entrada
    await this.fundRepository.increment(
      { id: data.fundId },
      'balance',
      this.normalizeAmount(data.amount),
    );

    // 4. Retornar Income criada
    return saved;
  }

  /**
   * OBTER SALDO DO FUNDO
   * 
   * Parâmetro:
   * - fundId: ID do fundo
   * 
   * Retorna:
   * - Fund entity com saldo atual
   * 
   * Uso típico:
   * const fund = await financesService.getFundBalance(fundId);
   * console.log(`Saldo do fundo: ${fund.balance} MT`);
   */
  async getFundBalance(fundId: string, churchId?: string): Promise<Fund> {
    const fund = await this.fundRepository.findOne({
      where: {
        id: fundId,
        ...(churchId ? { churchId } : {}),
      },
    });

    if (!fund) {
      throw new Error(`Fundo ${fundId} não encontrado ou fora do escopo da igreja`);
    }

    return fund;
  }

  /**
   * LISTAR ENTRADAS POR IGREJA
   * 
   * Parâmetro:
   * - churchId: ID da igreja
   * 
   * Retorna:
   * - Array de Income entities, ordenado por mais recente primeiro
   * 
   * Fluxo:
   * 1. Query BD filtrando por churchId (isolamento)
   * 2. Ordenar por createdAt DESC (mais recente primeiro)
   * 3. Retornar resultados
   * 
   * TODO: Adicionar pagination (limit/offset)
   * TODO: Adicionar filtros (por tipo, data, etc)
   */
  async getIncomeByChurch(churchId: string): Promise<Income[]> {
    // Procurar todas as entradas desta igreja
    return this.incomeRepository.find({
      where: { churchId }, // IMPORTANTE: Filtrar por churchId
      order: { createdAt: 'DESC' }, // Mais recente primeiro
    });
  }

  /**
   * LISTAR ENTRADAS POR FUNDO
   * 
   * Parâmetro:
   * - fundId: ID do fundo
   * 
   * Retorna:
   * - Array de Income entities do fundo
   * 
   * Uso típico:
   * const entradas = await financesService.getIncomeByFund(fundoGeral);
   * console.log(`Total de entradas para Fundo Geral: ${entradas.length}`);
   * 
   * TODO: Calcular total de entradas
   * TODO: Adicionar filtros por período (mês, ano)
   */
  async getIncomeByFund(fundId: string, churchId?: string): Promise<Income[]> {
    return this.incomeRepository.find({
      where: {
        fundId,
        ...(churchId ? { churchId } : {}),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * OBTER ENTRADA POR ID
   * 
   * Parâmetro:
   * - incomeId: ID da entrada
   * 
   * Retorna:
   * - Income entity ou null se não encontrado
   */
  async getIncomeById(incomeId: string): Promise<Income | null> {
    return this.incomeRepository.findOne({
      where: { id: incomeId },
    });
  }

  /**
   * CALCULAR TOTAL DE ENTRADAS POR PERÍODO
   * 
   * Parâmetros:
   * - churchId: ID da igreja
   * - startDate: Data início do período
   * - endDate: Data fim do período
   * 
   * Retorna:
   * - Montante total de entradas no período
   * 
   * Uso em relatórios:
   * const total = await financesService.getTotalIncomeByPeriod(
   *   churchId,
   *   new Date('2024-01-01'),
   *   new Date('2024-01-31')
   * );
   */
  async getTotalIncomeByPeriod(
    churchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // Query QueryBuilder para somar amount
    // SUM(amount) WHERE churchId = ? AND date BETWEEN ? AND ?
    const result = await this.incomeRepository
      .createQueryBuilder('income')
      .select('SUM(income.amount)', 'total')
      .where('income.churchId = :churchId', { churchId })
      .andWhere('income.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // Retornar total (pode ser null se nenhuma entrada)
    return result?.total ? parseFloat(result.total) : 0;
  }
}
