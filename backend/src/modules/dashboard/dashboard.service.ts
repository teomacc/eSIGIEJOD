import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Income } from '../finances/entities/income.entity';
import { Fund } from '../finances/entities/fund.entity';
import { Requisition, RequisitionState } from '../requisitions/entities/requisition.entity';

/**
 * SERVIÇO DE DASHBOARD (DashboardService)
 * 
 * Responsabilidade: Agregar dados de múltiplos módulos para exibição no dashboard
 * 
 * Métricas fornecidas:
 * 1. Receita Total do Mês - Soma de todas as entradas no mês atual
 * 2. Despesas do Mês - Soma de requisições executadas no mês atual
 * 3. Requisições Pendentes - Total de requisições em PENDENTE + EM_ANALISE
 * 4. Fundos Ativos - Lista de fundos com saldo > 0
 * 5. Balanço por Fundo - Entradas, Saídas, Saldo Actual
 * 6. Alertas - Avisos sobre fundos baixos, aprovações atrasadas, etc.
 */
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Income)
    private incomeRepository: Repository<Income>,
    @InjectRepository(Fund)
    private fundRepository: Repository<Fund>,
    @InjectRepository(Requisition)
    private requisitionRepository: Repository<Requisition>,
  ) {}

  /**
   * GET DASHBOARD METRICS - Retorna todas as métricas do dashboard
   * 
   * @param churchId - ID da igreja (isolamento de dados)
   * @returns Objeto com todas as métricas agregadas
   */
  async getDashboardMetrics(churchId: string) {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Mês anterior para comparação
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // 1. RECEITA DO MÊS ATUAL
      const receitaMesResult = await this.incomeRepository
        .createQueryBuilder('income')
        .select('SUM(income.amount)', 'total')
        .where('income.churchId = :churchId', { churchId })
        .andWhere('income.date >= :start', { start: firstDayOfMonth })
        .andWhere('income.date <= :end', { end: lastDayOfMonth })
        .getRawOne();

      const receitaMes = parseFloat(receitaMesResult?.total || '0');

    // Receita do mês anterior para comparação
    const receitaMesAnteriorResult = await this.incomeRepository
      .createQueryBuilder('income')
      .select('SUM(income.amount)', 'total')
      .where('income.churchId = :churchId', { churchId })
      .andWhere('income.date >= :start', { start: firstDayOfLastMonth })
      .andWhere('income.date <= :end', { end: lastDayOfLastMonth })
      .getRawOne();

    const receitaMesAnterior = parseFloat(receitaMesAnteriorResult?.total || '0');
    const receitaVariacao = receitaMesAnterior > 0 
      ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 
      : 0;

    // 2. DESPESAS DO MÊS ATUAL (Requisições executadas)
    const despesasMesResult = await this.requisitionRepository
      .createQueryBuilder('req')
      .select('SUM(COALESCE(req.approvedAmount, req.requestedAmount))', 'total')
      .where('req.churchId = :churchId', { churchId })
      .andWhere('req.state = :state', { state: RequisitionState.EXECUTED })
      .andWhere('req.executedAt >= :start', { start: firstDayOfMonth })
      .andWhere('req.executedAt <= :end', { end: lastDayOfMonth })
      .getRawOne();

    const despesasMes = parseFloat(despesasMesResult?.total || '0');

    // Despesas do mês anterior
    const despesasMesAnteriorResult = await this.requisitionRepository
      .createQueryBuilder('req')
      .select('SUM(COALESCE(req.approvedAmount, req.requestedAmount))', 'total')
      .where('req.churchId = :churchId', { churchId })
      .andWhere('req.state = :state', { state: RequisitionState.EXECUTED })
      .andWhere('req.executedAt >= :start', { start: firstDayOfLastMonth })
      .andWhere('req.executedAt <= :end', { end: lastDayOfLastMonth })
      .getRawOne();

    const despesasMesAnterior = parseFloat(despesasMesAnteriorResult?.total || '0');
    const despesasVariacao = despesasMesAnterior > 0 
      ? ((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100 
      : 0;

    // 3. REQUISIÇÕES PENDENTES
    const requisicoesResult = await this.requisitionRepository
      .createQueryBuilder('req')
      .select('req.state', 'state')
      .addSelect('req.magnitude', 'magnitude')
      .addSelect('COUNT(*)', 'count')
      .where('req.churchId = :churchId', { churchId })
      .andWhere('req.state IN (:...states)', { 
        states: [RequisitionState.PENDING, RequisitionState.UNDER_REVIEW] 
      })
      .groupBy('req.state')
      .addGroupBy('req.magnitude')
      .getRawMany();

    const totalPendentes = requisicoesResult.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    // Contar urgentes (CRITICA magnitude)
    const urgentes = requisicoesResult
      .filter(row => row.magnitude === 'CRITICA')
      .reduce((sum, row) => sum + parseInt(row.count), 0);

    // 4. FUNDOS ATIVOS
    const fundos = await this.fundRepository
      .createQueryBuilder('fund')
      .where('fund.churchId = :churchId', { churchId })
      .andWhere('fund.isActive = :isActive', { isActive: true })
      .orderBy('fund.balance', 'DESC')
      .getMany();

    const fundosAtivos = fundos.length;

    // 5. BALANÇO POR FUNDO - Entradas, Saídas, Saldo
    const balancoPorFundo = await Promise.all(
      fundos.map(async (fund) => {
        // Entradas do mês
        const entradasResult = await this.incomeRepository
          .createQueryBuilder('income')
          .select('SUM(income.amount)', 'total')
          .where('income.fundId = :fundId', { fundId: fund.id })
          .andWhere('income.date >= :start', { start: firstDayOfMonth })
          .andWhere('income.date <= :end', { end: lastDayOfMonth })
          .getRawOne();

        const entradas = parseFloat(entradasResult?.total || '0');

        // Saídas do mês (requisições executadas deste fundo)
        const saidasResult = await this.requisitionRepository
          .createQueryBuilder('req')
          .select('SUM(COALESCE(req.approvedAmount, req.requestedAmount))', 'total')
          .where('req.fundId = :fundId', { fundId: fund.id })
          .andWhere('req.state = :state', { state: RequisitionState.EXECUTED })
          .andWhere('req.executedAt >= :start', { start: firstDayOfMonth })
          .andWhere('req.executedAt <= :end', { end: lastDayOfMonth })
          .getRawOne();

        const saidas = parseFloat(saidasResult?.total || '0');

        return {
          id: fund.id,
          nome: this.formatFundType(fund.type),
          tipo: fund.type,
          entradas,
          saidas,
          saldo: parseFloat(fund.balance.toString()),
        };
      })
    );

    // 6. ALERTAS
    const alertas = [];

    // Alerta: Fundo com saldo baixo (< 5000 MT)
    const fundosBaixos = fundos.filter(f => parseFloat(f.balance.toString()) < 5000);
    if (fundosBaixos.length > 0) {
      alertas.push({
        tipo: 'warning',
        mensagem: `${fundosBaixos.length} fundo(s) com saldo abaixo de 5.000 MT`,
        fundos: fundosBaixos.map(f => this.formatFundType(f.type)),
      });
    }

    // Alerta: Requisições pendentes há mais de 7 dias
    const seteDiasAtras = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const requisicoesAtrasadas = await this.requisitionRepository
      .createQueryBuilder('req')
      .where('req.churchId = :churchId', { churchId })
      .andWhere('req.state = :state', { state: RequisitionState.PENDING })
      .andWhere('req.createdAt < :date', { date: seteDiasAtras })
      .getCount();

    if (requisicoesAtrasadas > 0) {
      alertas.push({
        tipo: 'warning',
        mensagem: `${requisicoesAtrasadas} requisição/ões pendente(s) há mais de 7 dias`,
      });
    }

    return {
      receita: {
        total: receitaMes,
        variacao: Math.round(receitaVariacao * 10) / 10, // Arredondar para 1 casa decimal
      },
      despesas: {
        total: despesasMes,
        variacao: Math.round(despesasVariacao * 10) / 10,
      },
      requisicoes: {
        total: totalPendentes,
        urgentes,
        normais: totalPendentes - urgentes,
      },
      fundos: {
        ativos: fundosAtivos,
        balanco: balancoPorFundo,
      },
      alertas,
    };
    } catch (error) {
      // Se as tabelas não existem ainda, retornar dashboard vazio
      console.error('Erro ao buscar métricas do dashboard:', error);
      return {
        receita: {
          total: 0,
          variacao: 0,
        },
        despesas: {
          total: 0,
          variacao: 0,
        },
        requisicoes: {
          total: 0,
          urgentes: 0,
          normais: 0,
        },
        fundos: {
          ativos: 0,
          balanco: [],
        },
        alertas: [{
          tipo: 'info',
          mensagem: 'Sistema inicializado. Aguardando primeiros registros.',
        }],
      };
    }
  }

  /**
   * Formatar nome do tipo de fundo para exibição
   */
  private formatFundType(type: string): string {
    const mapping: Record<string, string> = {
      'FUNDO_GERAL': 'Fundo Geral',
      'FUNDO_CONSTRUCAO': 'Fundo de Construção',
      'FUNDO_MISSOES': 'Fundo de Missões',
      'FUNDO_SOCIAL': 'Fundo Social',
      'FUNDO_EVENTOS': 'Fundo de Eventos',
      'FUNDO_EMERGENCIA': 'Fundo de Emergência',
      'FUNDO_PROJECTOS_ESPECIAIS': 'Projectos Especiais',
      'FUNDO_JUVENTUDE': 'Fundo da Juventude',
      'FUNDO_MULHERES': 'Fundo das Mulheres',
      'FUNDO_MANUTENCAO': 'Fundo de Manutenção',
    };
    return mapping[type] || type;
  }
}
