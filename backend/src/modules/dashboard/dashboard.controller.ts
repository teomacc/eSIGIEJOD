import { Controller, Get, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';

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

  private resolveChurchId(req: any): string {
    const churchId = req.churchId || req.user?.churchId || req.query?.churchId;
    if (!churchId) {
      throw new BadRequestException('Necessário indicar igreja para visualizar dashboard');
    }
    return churchId;
  }
}
