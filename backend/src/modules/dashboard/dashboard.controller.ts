import { Controller, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';
import { UserRole } from '../auth/entities/user.entity';

/**
 * CONTROLLER DE DASHBOARD (DashboardController)
 * 
 * Responsabilidade: Expor endpoints para métricas do dashboard
 * 
 * Endpoints:
 * - GET /dashboard/metrics - Retorna todas as métricas agregadas
 * 
 * Segurança:
 * - Todas as rotas protegidas por JWT
 * - Dados isolados por churchId do usuário autenticado
 */
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), ChurchScopeGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/metrics
   * 
   * Retorna métricas agregadas do dashboard:
   * - Receita total do mês com variação percentual
   * - Despesas do mês com variação percentual
   * - Requisições pendentes (total, urgentes, normais)
   * - Fundos ativos com balanço detalhado
   * - Alertas importantes
   * 
   * @param req - Request com dados do usuário autenticado (JWT)
   * @returns Objeto com todas as métricas
   */
  @Get('metrics')
  async getMetrics(@Request() req: any) {
    const churchId = this.resolveChurchId(req);
    return this.dashboardService.getDashboardMetrics(churchId);
  }

    /**
     * GET /dashboard/obreiro-metrics
     * 
     * Retorna métricas resumidas para Obreiros:
     * - Total de requisições criadas
     * - Valor total solicitado/aprovado
     * - Requisições por status
     * - Últimas 5 requisições
     * 
     * Obreiros NÃO veem fundos da igreja
     * 
     * @param req - Request com dados do usuário autenticado (JWT)
     * @returns Objeto com métricas pessoais do obreiro
     */
    @Get('obreiro-metrics')
    async getObreiroMetrics(@Request() req: any) {
      const userId = req.user?.id || req.user?.userId;
      const churchId = req.user?.churchId;

      if (!userId || !churchId) {
        throw new BadRequestException('Utilizador e igreja são obrigatórios');
      }

      return this.dashboardService.getObreiroMetrics(userId, churchId);
    }

  private resolveChurchId(req: any): string | null {
    const userRoles: string[] = req.user?.roles || [];
    // Apenas ADMIN e LIDER_FINANCEIRO_GERAL são globais
    const isGlobal = userRoles.some((role) =>
      [UserRole.ADMIN, UserRole.LIDER_FINANCEIRO_GERAL].includes(role as UserRole)
    );

    const churchId = req.query?.churchId || req.churchId || req.user?.churchId;

    // Para utilizadores globais, churchId é opcional (permite visão geral)
    if (isGlobal) {
      return churchId || null;
    }

    if (!churchId) {
      throw new BadRequestException('Necessário indicar igreja para visualizar dashboard');
    }
    return churchId;
  }
}
