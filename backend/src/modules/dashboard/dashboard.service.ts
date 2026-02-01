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
  async getDashboardMetrics(churchId?: string | null) {
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Mês anterior para comparação
      const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

      // 1. RECEITA DO MÊS ATUAL
      const receitaMesQuery = this.incomeRepository
        .createQueryBuilder('income')
        .select('SUM(income.amount)', 'total')
        .where('income.date >= :start', { start: firstDayOfMonth })
        .andWhere('income.date <= :end', { end: lastDayOfMonth });

      if (churchId) {
        receitaMesQuery.andWhere('income.churchId = :churchId', { churchId });
      }

      const receitaMesResult = await receitaMesQuery.getRawOne();

      const receitaMes = parseFloat(receitaMesResult?.total || '0');

    // Receita do mês anterior para comparação
    const receitaMesAnteriorQuery = this.incomeRepository
      .createQueryBuilder('income')
      .select('SUM(income.amount)', 'total')
      .where('income.date >= :start', { start: firstDayOfLastMonth })
      .andWhere('income.date <= :end', { end: lastDayOfLastMonth });

    if (churchId) {
      receitaMesAnteriorQuery.andWhere('income.churchId = :churchId', { churchId });
    }

    const receitaMesAnteriorResult = await receitaMesAnteriorQuery.getRawOne();

    const receitaMesAnterior = parseFloat(receitaMesAnteriorResult?.total || '0');
    const receitaVariacao = receitaMesAnterior > 0 
      ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 
      : 0;

    // 2. DESPESAS DO MÊS ATUAL (Requisições executadas)
    const despesasMesQuery = this.requisitionRepository
      .createQueryBuilder('req')
      .select('SUM(COALESCE(req.approvedAmount, req.requestedAmount))', 'total')
      .where('req.state = :state', { state: RequisitionState.EXECUTED })
      .andWhere('req.executedAt >= :start', { start: firstDayOfMonth })
      .andWhere('req.executedAt <= :end', { end: lastDayOfMonth });

    if (churchId) {
      despesasMesQuery.andWhere('req.churchId = :churchId', { churchId });
    }

    const despesasMesResult = await despesasMesQuery.getRawOne();

    const despesasMes = parseFloat(despesasMesResult?.total || '0');

    // Despesas do mês anterior
    const despesasMesAnteriorQuery = this.requisitionRepository
      .createQueryBuilder('req')
      .select('SUM(COALESCE(req.approvedAmount, req.requestedAmount))', 'total')
      .where('req.state = :state', { state: RequisitionState.EXECUTED })
      .andWhere('req.executedAt >= :start', { start: firstDayOfLastMonth })
      .andWhere('req.executedAt <= :end', { end: lastDayOfLastMonth });

    if (churchId) {
      despesasMesAnteriorQuery.andWhere('req.churchId = :churchId', { churchId });
    }

    const despesasMesAnteriorResult = await despesasMesAnteriorQuery.getRawOne();

    const despesasMesAnterior = parseFloat(despesasMesAnteriorResult?.total || '0');
    const despesasVariacao = despesasMesAnterior > 0 
      ? ((despesasMes - despesasMesAnterior) / despesasMesAnterior) * 100 
      : 0;

    // 3. REQUISIÇÕES PENDENTES
    const requisicoesQuery = this.requisitionRepository
      .createQueryBuilder('req')
      .select('req.state', 'state')
      .addSelect('req.magnitude', 'magnitude')
      .addSelect('COUNT(*)', 'count')
      .where('req.state IN (:...states)', {
        states: [RequisitionState.PENDING, RequisitionState.UNDER_REVIEW],
      })
      .groupBy('req.state')
      .addGroupBy('req.magnitude');

    if (churchId) {
      requisicoesQuery.andWhere('req.churchId = :churchId', { churchId });
    }

    const requisicoesResult = await requisicoesQuery.getRawMany();

    const totalPendentes = requisicoesResult.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    // Contar urgentes (CRITICA magnitude)
    const urgentes = requisicoesResult
      .filter(row => row.magnitude === 'CRITICA')
      .reduce((sum, row) => sum + parseInt(row.count), 0);

    // 4. FUNDOS ATIVOS
    const fundosQuery = this.fundRepository
      .createQueryBuilder('fund')
      .where('fund.isActive = :isActive', { isActive: true })
      .orderBy('fund.balance', 'DESC');

    if (churchId) {
      fundosQuery.andWhere('fund.churchId = :churchId', { churchId });
    }

    const fundos = await fundosQuery.getMany();

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

    /**
     * GET OBREIRO METRICS - Retorna métricas resumidas para Obreiros
     * 
     * Obreiros não devem ver fundos da igreja, apenas:
     * - Total de requisições criadas por ele
     * - Valor total solicitado
     * - Requisições por status (pendentes, aprovadas, executadas)
     * - Últimas 5 requisições
     * 
     * @param userId - ID do obreiro
     * @param churchId - ID da igreja
     * @returns Objeto com métricas pessoais do obreiro
     */
    async getObreiroMetrics(userId: string, churchId: string) {
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Requisições criadas pelo obreiro
        const minhasRequisicoes = await this.requisitionRepository
          .createQueryBuilder('req')
          .where('req.createdBy = :userId', { userId })
          .andWhere('req.churchId = :churchId', { churchId })
          .orderBy('req.createdAt', 'DESC')
          .getMany();

        // Total de requisições
        const totalRequisicoes = minhasRequisicoes.length;

        // Requisições por status
        const pendentes = minhasRequisicoes.filter(r => r.state === RequisitionState.PENDING).length;
        const emAnalise = minhasRequisicoes.filter(r => r.state === RequisitionState.UNDER_REVIEW).length;
        const aprovadas = minhasRequisicoes.filter(r => r.state === RequisitionState.APPROVED).length;
        const executadas = minhasRequisicoes.filter(r => r.state === RequisitionState.EXECUTED).length;
        const rejeitadas = minhasRequisicoes.filter(r => r.state === RequisitionState.REJECTED).length;

        // Valor total solicitado (todas as requisições)
        const valorTotalSolicitado = minhasRequisicoes.reduce((sum, req) => {
          return sum + parseFloat(req.requestedAmount.toString());
        }, 0);

        // Valor total aprovado (aprovadas + executadas)
        const valorTotalAprovado = minhasRequisicoes
          .filter(r => r.state === RequisitionState.APPROVED || r.state === RequisitionState.EXECUTED)
          .reduce((sum, req) => {
            return sum + parseFloat((req.approvedAmount || req.requestedAmount).toString());
          }, 0);

        // Requisições do mês atual
        const requisicoesMes = minhasRequisicoes.filter(r => {
          return r.createdAt >= firstDayOfMonth && r.createdAt <= lastDayOfMonth;
        });

        const valorMes = requisicoesMes.reduce((sum, req) => {
          return sum + parseFloat(req.requestedAmount.toString());
        }, 0);

        // Últimas 5 requisições
        const ultimasRequisicoes = minhasRequisicoes.slice(0, 5).map(req => ({
          id: req.id,
          descricao: req.description,
          valor: parseFloat(req.requestedAmount.toString()),
          estado: req.state,
          criadaEm: req.createdAt,
        }));

        return {
          resumo: {
            totalRequisicoes,
            valorTotalSolicitado,
            valorTotalAprovado,
          },
          mesAtual: {
            requisicoes: requisicoesMes.length,
            valor: valorMes,
          },
          porStatus: {
            pendentes,
            emAnalise,
            aprovadas,
            executadas,
            rejeitadas,
          },
          ultimasRequisicoes,
        };
      } catch (error) {
        console.error('Erro ao buscar métricas do obreiro:', error);
        return {
          resumo: {
            totalRequisicoes: 0,
            valorTotalSolicitado: 0,
            valorTotalAprovado: 0,
          },
          mesAtual: {
            requisicoes: 0,
            valor: 0,
          },
          porStatus: {
            pendentes: 0,
            emAnalise: 0,
            aprovadas: 0,
            executadas: 0,
            rejeitadas: 0,
          },
          ultimasRequisicoes: [],
        };
      }
    }
}
