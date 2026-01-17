import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovimentoFinanceiro } from './entities/financial-movement.entity';

/**
 * SERVIÇO DE MOVIMENTOS FINANCEIROS (FinancialMovementService)
 * 
 * Responsabilidade: Registar e consultar movimentos que afetam saldos
 * 
 * Funcionalidades:
 * 1. Registar movimento (entrada/saída/ajuste)
 * 2. Consultar movimentos por período
 * 3. Validar limites diários/mensais
 * 4. Calcular saldo via movimentos
 * 
 * IMPORTANTE:
 * - Movimentos são IMUTÁVEIS (sem updates/deletes)
 * - Cada entrada/saída cria um novo movimento
 * - Correções são movimentos tipo AJUSTE
 */
@Injectable()
export class FinancialMovementService {
  constructor(
    @InjectRepository(MovimentoFinanceiro)
    private movimentoRepository: Repository<MovimentoFinanceiro>,
  ) {}

  /**
   * Registar um movimento
   * 
   * Usado por:
   * - FinancesService ao registar receita (ENTRADA)
   * - ExpenseService ao executar despesa (SAIDA)
   * - Admin ao fazer ajustes (AJUSTE)
   */
  async createMovement(data: {
    churchId: string;
    fundId: string;
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
    valor: number;
    referenciaId: string;
    referenciaTipo: 'REVENUE_FUND' | 'EXPENSE' | 'ADJUSTMENT';
    dataMovimento: Date;
    criadoPor: string;
    descricao?: string;
  }): Promise<MovimentoFinanceiro> {
    if (!data.valor || data.valor <= 0) {
      throw new BadRequestException('Valor deve ser maior que zero');
    }

    const movimento = this.movimentoRepository.create(data);
    return this.movimentoRepository.save(movimento);
  }

  /**
   * Obter movimentos de um fundo
   */
  async getMovementsByFund(
    fundId: string,
    churchId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MovimentoFinanceiro[]> {
    let query = this.movimentoRepository
      .createQueryBuilder('movimento')
      .where('movimento.fundId = :fundId', { fundId })
      .andWhere('movimento.churchId = :churchId', { churchId })
      .orderBy('movimento.dataMovimento', 'ASC');

    if (startDate && endDate) {
      query = query.andWhere(
        'movimento.dataMovimento BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    }

    return query.getMany();
  }

  /**
   * Obter movimentos por período (toda a igreja)
   */
  async getMovementsByPeriod(
    churchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MovimentoFinanceiro[]> {
    return this.movimentoRepository
      .createQueryBuilder('movimento')
      .where('movimento.churchId = :churchId', { churchId })
      .andWhere(
        'movimento.dataMovimento BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      )
      .orderBy('movimento.dataMovimento', 'ASC')
      .getMany();
  }

  /**
   * Calcular saldo de um fundo via movimentos
   * 
   * Fórmula:
   * saldo = SUM(ENTRADA) - SUM(SAIDA) + SUM(AJUSTE)
   * 
   * NOTA: Este é um método de verificação
   * O saldo real é mantido em Fund.balance
   * Este método é usado para auditoria/validação
   */
  async calculateFundBalance(
    fundId: string,
    churchId: string,
  ): Promise<number> {
    const result = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .select(
        `
        COALESCE(SUM(CASE WHEN movimento.tipo = 'ENTRADA' THEN movimento.valor ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN movimento.tipo = 'SAIDA' THEN movimento.valor ELSE 0 END), 0) +
        COALESCE(SUM(CASE WHEN movimento.tipo = 'AJUSTE' THEN movimento.valor ELSE 0 END), 0)
      `,
        'saldo',
      )
      .where('movimento.fundId = :fundId', { fundId })
      .andWhere('movimento.churchId = :churchId', { churchId })
      .getRawOne();

    return result?.saldo ? parseFloat(result.saldo) : 0;
  }

  /**
   * Validar limite diário
   * 
   * Retorna total de saídas no dia
   */
  async getDailyTotal(
    churchId: string,
    date: Date,
  ): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .select('SUM(movimento.valor)', 'total')
      .where('movimento.churchId = :churchId', { churchId })
      .andWhere('movimento.tipo = :tipo', { tipo: 'SAIDA' })
      .andWhere(
        'movimento.dataMovimento BETWEEN :startOfDay AND :endOfDay',
        { startOfDay, endOfDay },
      )
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Validar limite mensal
   * 
   * Retorna total de saídas no mês
   */
  async getMonthlyTotal(
    churchId: string,
    year: number,
    month: number,
  ): Promise<number> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const result = await this.movimentoRepository
      .createQueryBuilder('movimento')
      .select('SUM(movimento.valor)', 'total')
      .where('movimento.churchId = :churchId', { churchId })
      .andWhere('movimento.tipo = :tipo', { tipo: 'SAIDA' })
      .andWhere(
        'movimento.dataMovimento BETWEEN :startOfMonth AND :endOfMonth',
        { startOfMonth, endOfMonth },
      )
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Listar movimentos de um fundo (paginado)
   */
  async getMovementsPaginated(
    fundId: string,
    churchId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<[MovimentoFinanceiro[], number]> {
    return this.movimentoRepository.findAndCount({
      where: { fundId, churchId },
      order: { dataMovimento: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Listagem com filtros (fundId opcional, período, tipo, faixa de valor, busca em descrição)
   */
  async getMovementsFiltered(params: {
    churchId: string;
    fundId?: string;
    startDate?: Date;
    endDate?: Date;
    tipo?: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<[MovimentoFinanceiro[], number]> {
    const {
      churchId,
      fundId,
      startDate,
      endDate,
      tipo,
      minAmount,
      maxAmount,
      search,
      limit = 100,
      offset = 0,
    } = params;

    const qb = this.movimentoRepository
      .createQueryBuilder('m')
      .where('m.churchId = :churchId', { churchId })
      .orderBy('m.dataMovimento', 'DESC');

    if (fundId) {
      qb.andWhere('m.fundId = :fundId', { fundId });
    }

    if (startDate) {
      qb.andWhere('m.dataMovimento >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('m.dataMovimento <= :endDate', { endDate });
    }

    if (tipo) {
      qb.andWhere('m.tipo = :tipo', { tipo });
    }

    if (minAmount !== undefined) {
      qb.andWhere('m.valor >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      qb.andWhere('m.valor <= :maxAmount', { maxAmount });
    }

    if (search && search.trim().length > 0) {
      qb.andWhere('m.descricao ILIKE :search', {
        search: `%${search.trim()}%`,
      });
    }

    qb.take(limit).skip(offset);

    return qb.getManyAndCount();
  }
}
