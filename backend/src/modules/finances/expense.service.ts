import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Despesa } from './entities/expense.entity';
import { MovimentoFinanceiro } from './entities/financial-movement.entity';
import { Fund } from './entities/fund.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

/**
 * SERVIÇO DE DESPESAS (ExpenseService)
 * 
 * Responsabilidade: Gerir execução de requisições e criação de despesas
 * 
 * IMPORTANTE - Transações:
 * Quando requisição é executada (paga):
 * 1. Criar Despesa (registro imutável do pagamento)
 * 2. Criar MovimentoFinanceiro SAIDA (registar debit)
 * 3. Decrementar Fund.balance
 * 4. Registar auditoria
 * 
 * Tudo precisa ser atômico - ou todas as operações sucedem, ou nenhuma
 */
@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Despesa)
    private despesaRepository: Repository<Despesa>,
    @InjectRepository(MovimentoFinanceiro)
    private movimentoRepository: Repository<MovimentoFinanceiro>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Executar requisição (criar despesa)
   * 
   * Parâmetros:
   * - requisicaoId: ID da requisição
   * - fundId: ID do fundo
   * - churchId: ID da igreja
   * - valor: Montante a pagar
   * - dataPagamento: Quando foi pago
   * - executadoPor: Quem executou
   * - comprovativoUrl: URL do comprovativo (opcional)
   * - observacoes: Notas (opcional)
   * 
   * Retorna: Despesa criada
   */
  async createExpense(data: {
    requisicaoId: string;
    fundId: string;
    churchId: string;
    valor: number;
    dataPagamento: Date;
    executadoPor: string;
    comprovativoUrl?: string;
    observacoes?: string;
  }): Promise<Despesa> {
    // Validações
    if (!data.valor || data.valor <= 0) {
      throw new BadRequestException('Valor deve ser maior que zero');
    }

    if (!data.dataPagamento) {
      throw new BadRequestException('Data de pagamento é obrigatória');
    }

    // Validar que fundo existe e pertence à igreja
    const fund = await this.fundRepository.findOne({
      where: { id: data.fundId, churchId: data.churchId, isActive: true },
    });

    if (!fund) {
      throw new BadRequestException(
        'Fundo não encontrado ou inativo para esta igreja',
      );
    }

    // Validar que fundo tem saldo suficiente
    const fundoBalance = Number(fund.balance);
    if (fundoBalance < data.valor) {
      throw new BadRequestException(
        `Saldo insuficiente. Saldo: ${fundoBalance} MT, Solicitado: ${data.valor} MT`,
      );
    }

    // Transação atômica
    const result = await this.dataSource.transaction(async (manager) => {
      const despesaRepo = manager.getRepository(Despesa);
      const movimentoRepo = manager.getRepository(MovimentoFinanceiro);
      const fundRepo = manager.getRepository(Fund);

      // 1. Criar Despesa
      const despesa = despesaRepo.create({
        requisicaoId: data.requisicaoId,
        fundId: data.fundId,
        churchId: data.churchId,
        valor: data.valor,
        dataPagamento: data.dataPagamento,
        executadoPor: data.executadoPor,
        comprovativoUrl: data.comprovativoUrl,
        observacoes: data.observacoes,
      });

      const savedDespesa = await despesaRepo.save(despesa);

      // 2. Criar MovimentoFinanceiro SAIDA
      const movimento = movimentoRepo.create({
        churchId: data.churchId,
        fundId: data.fundId,
        tipo: 'SAIDA',
        valor: data.valor,
        referenciaId: savedDespesa.id,
        referenciaTipo: 'EXPENSE',
        dataMovimento: data.dataPagamento,
        criadoPor: data.executadoPor,
        descricao: `Despesa - Requisição ${data.requisicaoId}`,
      });

      await movimentoRepo.save(movimento);

      // 3. Decrementar Fund.balance
      await fundRepo.decrement(
        { id: data.fundId },
        'balance',
        data.valor,
      );

      return savedDespesa;
    });

    // 4. Registar auditoria
    await this.auditService.logAction({
      churchId: data.churchId,
      userId: data.executadoPor,
      action: AuditAction.REQUISITION_EXECUTED,
      entityId: result.id,
      entityType: 'Despesa',
      changes: {
        requisicaoId: data.requisicaoId,
        fundId: data.fundId,
        valor: data.valor,
        dataPagamento: data.dataPagamento,
        comprovativo: data.comprovativoUrl,
      },
      description: `Despesa de ${data.valor} MT executada da requisição ${data.requisicaoId}`,
    });

    return result;
  }

  /**
   * Obter despesa por ID
   */
  async getExpenseById(id: string): Promise<Despesa | null> {
    return this.despesaRepository.findOne({
      where: { id },
      relations: ['requisicao'],
    });
  }

  /**
   * Listar despesas de uma igreja
   */
  async getExpensesByChurch(
    churchId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<[Despesa[], number]> {
    return this.despesaRepository.findAndCount({
      where: { churchId },
      relations: ['requisicao'],
      order: { dataPagamento: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Listar despesas de um fundo
   */
  async getExpensesByFund(
    fundId: string,
    churchId: string,
  ): Promise<Despesa[]> {
    return this.despesaRepository.find({
      where: { fundId, churchId },
      relations: ['requisicao'],
      order: { dataPagamento: 'DESC' },
    });
  }

  /**
   * Listar despesas por período
   */
  async getExpensesByPeriod(
    churchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Despesa[]> {
    return this.despesaRepository
      .createQueryBuilder('despesa')
      .where('despesa.churchId = :churchId', { churchId })
      .andWhere('despesa.dataPagamento BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('despesa.dataPagamento', 'DESC')
      .getMany();
  }

  /**
   * Calcular total de despesas num período
   */
  async getTotalExpensesByPeriod(
    churchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.despesaRepository
      .createQueryBuilder('despesa')
      .select('SUM(despesa.valor)', 'total')
      .where('despesa.churchId = :churchId', { churchId })
      .andWhere('despesa.dataPagamento BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return result?.total ? parseFloat(result.total) : 0;
  }

  /**
   * Verificar se requisição já foi executada
   */
  async isRequisitionExecuted(requisicaoId: string): Promise<boolean> {
    const count = await this.despesaRepository.count({
      where: { requisicaoId },
    });
    return count > 0;
  }

  /**
   * Listagem com filtros e paginação
   */
  async getExpensesFiltered(params: {
    churchId: string;
    fundId?: string;
    executorId?: string;
    startDate?: Date;
    endDate?: Date;
    minAmount?: number;
    maxAmount?: number;
    search?: string; // busca em justificativa/observações/código da requisição
    limit?: number;
    offset?: number;
  }): Promise<[Despesa[], number]> {
    const {
      churchId,
      fundId,
      executorId,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      search,
      limit = 100,
      offset = 0,
    } = params;

    const qb = this.despesaRepository
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.requisicao', 'r')
      .where('d.churchId = :churchId', { churchId })
      .orderBy('d.dataPagamento', 'DESC');

    if (fundId) {
      qb.andWhere('d.fundId = :fundId', { fundId });
    }

    if (executorId) {
      qb.andWhere('d.executadoPor = :executorId', { executorId });
    }

    if (startDate) {
      qb.andWhere('d.dataPagamento >= :startDate', { startDate });
    }

    if (endDate) {
      qb.andWhere('d.dataPagamento <= :endDate', { endDate });
    }

    if (minAmount !== undefined) {
      qb.andWhere('d.valor >= :minAmount', { minAmount });
    }

    if (maxAmount !== undefined) {
      qb.andWhere('d.valor <= :maxAmount', { maxAmount });
    }

    if (search && search.trim().length > 0) {
      const like = `%${search.trim()}%`;
      qb.andWhere(
        '(r.justification ILIKE :like OR r.code ILIKE :like OR d.observacoes ILIKE :like)',
        { like },
      );
    }

    qb.take(limit).skip(offset);

    return qb.getManyAndCount();
  }
}
