import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

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
@UseGuards(JwtAuthGuard)
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
    const churchId = req.user.churchId;
    return this.dashboardService.getDashboardMetrics(churchId);
  }
}
