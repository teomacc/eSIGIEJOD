import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income, IncomeType } from './entities/income.entity';
import { Fund, FundType } from './entities/fund.entity';

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
  ) {}

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
      parseFloat(data.amount.toString()),
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
  async getFundBalance(fundId: string): Promise<Fund> {
    // Procurar fund por ID
    const fund = await this.fundRepository.findOne({ 
      where: { id: fundId } 
    });
    
    if (!fund) {
      throw new Error(`Fundo ${fundId} não encontrado`);
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
  async getIncomeByFund(fundId: string): Promise<Income[]> {
    // Procurar todas as entradas deste fundo
    return this.incomeRepository.find({
      where: { fundId },
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
