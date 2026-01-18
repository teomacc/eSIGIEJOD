import { Controller, Get, Param, Req, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';

/**
 * CONTROLADOR DE AUDITORIA (AuditController)
 * 
 * Responsabilidade: Gerir endpoints para consultar logs de auditoria
 * 
 * Endpoints:
 * - GET /audit/logs - Listar logs da iglesia
 * - GET /audit/logs/entity/{id} - Histórico de entidade
 * - GET /audit/logs/action/{action} - Filtrar por ação
 * - GET /audit/logs/user/{userId} - Ações de um usuário
 * - GET /audit/logs/period - Logs por período
 * 
 * Autenticação:
 * - Todos endpoints requerem JWT válido
 * - AUDITOR pode ver tudo
 * - Outros usuários podem ver logs da sua iglesia
 * 
 * Fluxo:
 * 1. Cliente envia GET request
 * 2. Controller extrai parâmetros
 * 3. Controller chama AuditService
 * 4. AuditService consulta BD
 * 5. Controller retorna resultados (JSON)
 */
@Controller('audit')
@UseGuards(AuthGuard('jwt'), ChurchScopeGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * LISTAR LOGS - GET /audit/logs
   * 
   * Query params:
   * - limit: Máximo de resultados (padrão: 100)
   * - offset: Deslocamento para pagination (padrão: 0)
   * 
   * Resposta:
   * [
   *   {
   *     "id": "uuid...",
   *     "churchId": "uuid...",
   *     "userId": "uuid...",
   *     "action": "REQUISITION_APPROVED",
   *     "entityId": "uuid...",
   *     "entityType": "Requisition",
   *     "changes": { ... },
   *     "description": "Requisição aprovada",
   *     "createdAt": "2024-01-15T10:30:00Z"
   *   },
   *   ...
   * ]
   * 
   * Fluxo:
   * 1. Extrair churchId do JWT
   * 2. Chamar AuditService com churchId
   * 3. Retornar logs da iglesia
   * 4. Ordenado por mais recente primeiro
   * 
   * Uso:
   * GET /audit/logs?limit=50&offset=0
   * Mostra primeiro 50 logs
   */
  @Get('logs')
  async getAuditLogs(
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @Req() req: any,
  ) {
    const churchId = this.resolveChurchId(req);

    const [logs, total] = await this.auditService.getAuditLogsByChurch(
      churchId,
      limit,
      offset,
    );

    // Retornar com informações de pagination
    return {
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * HISTÓRICO DE ENTIDADE - GET /audit/logs/entity/{id}
   * 
   * Path param:
   * - id: ID da entidade (requisição, income, etc)
   * 
   * Resposta:
   * Array com histórico completo da entidade (ordem cronológica)
   * 
   * Exemplo:
   * GET /audit/logs/entity/abc-123-requisition
   * 
   * Resposta:
   * [
   *   { action: REQUISITION_CREATED, createdAt: 2024-01-01T09:00:00Z },
   *   { action: REQUISITION_UNDER_REVIEW, createdAt: 2024-01-01T09:05:00Z },
   *   { action: REQUISITION_APPROVED, createdAt: 2024-01-01T10:30:00Z },
   *   { action: REQUISITION_EXECUTED, createdAt: 2024-01-02T14:00:00Z }
   * ]
   * 
   * Mostra ciclo de vida completo
   * Útil para auditar uma requisição específica
   */
  @Get('logs/entity/:id')
  async getEntityAuditLog(@Param('id') entityId: string) {
    return this.auditService.getAuditLogsForEntity(entityId);
  }

  /**
   * FILTRAR POR AÇÃO - GET /audit/logs/action/{action}
   * 
   * Path param:
   * - action: Tipo de ação (REQUISITION_APPROVED, INCOME_RECORDED, etc)
   * 
   * Resposta:
   * Array de todos os logs desta ação
   * 
   * Exemplo:
   * GET /audit/logs/action/REQUISITION_APPROVED
   * Mostra todas as requisições aprovadas
   * 
   * Usado para:
   * - Análise de tendências
   * - Estatísticas por tipo de ação
   * - Relatórios periódicos
   */
  @Get('logs/action/:action')
  async getAuditLogsByAction(
    @Param('action') action: AuditAction,
    @Req() req: any,
  ) {
    return this.auditService.getAuditLogsByAction(
      this.resolveChurchId(req),
      action,
    );
  }

  /**
   * AÇÕES DE USUÁRIO - GET /audit/logs/user/{userId}
   * 
   * Path param:
   * - userId: ID do usuário
   * 
   * Resposta:
   * Array de todas as ações realizadas por este usuário
   * 
   * Exemplo:
   * GET /audit/logs/user/abc-123-user
   * Mostra tudo que este usuário fez
   * 
   * Importante:
   * - Rastreamento de atividade de usuário
   * - Investigação de ações suspeitas
   * - Compliance e governance
   */
  @Get('logs/user/:userId')
  async getAuditLogsByUser(
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    return this.auditService.getAuditLogsByUser(
      this.resolveChurchId(req),
      userId,
    );
  }

  /**
   * LOGS POR PERÍODO - GET /audit/logs/period
   * 
   * Query params:
   * - startDate: Data início (formato: YYYY-MM-DD)
   * - endDate: Data fim (formato: YYYY-MM-DD)
   * 
   * Resposta:
   * Array de logs do período especificado
   * 
   * Exemplo:
   * GET /audit/logs/period?startDate=2024-01-01&endDate=2024-01-31
   * Auditoria de janeiro
   * 
   * Usado para:
   * - Auditorias periódicas (mensal, trimestral, anual)
   * - Relatórios de compliance
   * - Investigações de período específico
   */
  @Get('logs/period')
  async getAuditLogsByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Req() req: any,
  ) {
    // Converter strings para Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validar datas
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return {
        error: 'Datas inválidas. Use formato YYYY-MM-DD',
      };
    }

    // Chamar serviço
    return this.auditService.getAuditLogsByPeriod(
      this.resolveChurchId(req),
      start,
      end,
    );
  }

  private resolveChurchId(req: any): string {
    const churchId = req.churchId || req.user?.churchId || req.query?.churchId;
    if (!churchId) {
      throw new BadRequestException('Necessário indicar igreja para consultar auditoria');
    }
    return churchId;
  }
}
