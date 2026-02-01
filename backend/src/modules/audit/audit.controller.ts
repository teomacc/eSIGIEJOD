import { Controller, Get, Post, Param, Req, Query, UseGuards, BadRequestException, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { AuditAction } from './entities/audit-log.entity';
import { ChurchScopeGuard } from '../auth/guards/church-scope.guard';
import { UserRole } from '../auth/entities/user.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleGuard } from '../auth/guards/role.guard';

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
@UseGuards(AuthGuard('jwt'), ChurchScopeGuard, RoleGuard)
export class AuditController {
  constructor(private auditService: AuditService) {}

  /**
   * Verificar se string é um UUID válido
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * LISTAR LOGS - GET /audit/logs
   * 
   * Apenas Líder Financeiro Geral e Admin podem acessar auditoria
   * 
   * Query params:
   * - limit: Máximo de resultados (padrão: 100)
   * - offset: Deslocamento para pagination (padrão: 0)
   */
  @Get('logs')
  @Roles(UserRole.LIDER_FINANCEIRO_GERAL, UserRole.ADMIN, UserRole.AUDITOR)
  async getAuditLogs(
    @Query('limit') limit: number = 100,
    @Query('offset') offset: number = 0,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Req() req: any,
  ) {
    const churchId = this.resolveChurchId(req);

    // Se userId foi fornecido e não é UUID, procurar o utilizador por email/username
    let resolvedUserId = userId;
    if (userId && !this.isValidUUID(userId)) {
      const user = await this.auditService.getUserByEmailOrUsername(userId);
      if (user) {
        resolvedUserId = user.id;
      } else {
        // Se não encontrar utilizador, retornar lista vazia
        return {
          logs: [],
          total: 0,
          message: `Utilizador "${userId}" não encontrado`,
        };
      }
    }

    const [logs, total] = await this.auditService.getAuditLogsByChurch(
      churchId,
      limit,
      offset,
      action,
      resolvedUserId,
    );

    // Enriquecer logs com nomes de utilizadores
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const user = await this.auditService.getUserById(log.userId);
        return {
          ...log,
          userName: user?.email || user?.username || 'Desconhecido',
        };
      })
    );

    // Retornar com informações de pagination
    return {
      logs: enrichedLogs,
      total,
      pagination: {
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

  /**
   * REGISTAR EVENTOS EM BATCH - POST /audit/batch-log
   * 
   * Endpoint para receber múltiplos eventos de auditoria do frontend
   * 
   * Body:
   * {
   *   "events": [
   *     {
   *       "action": "ELEMENT_CLICKED",
   *       "description": "Clique em botão",
   *       "metadata": { ... }
   *     },
   *     ...
   *   ]
   * }
   * 
   * Resposta (201 Created):
   * {
   *   "success": true,
   *   "count": 5,
   *   "message": "5 eventos registados com sucesso"
   * }
   * 
   * Fluxo:
   * 1. Frontend coleciona eventos
   * 2. Envia batch a cada 5 segundos
   * 3. Backend recebe e processa
   * 4. Armazena na BD com contexto completo
   */
  @Post('batch-log')
  @UseGuards(AuthGuard('jwt'))
  async logEventsBatch(
    @Body() dto: { events: any[] },
    @Req() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    const roles: string[] = req.user?.roles || [];
    const isGlobal = roles.includes(UserRole.ADMIN) || roles.includes(UserRole.LIDER_FINANCEIRO_GERAL) || roles.includes(UserRole.AUDITOR);
    // Permitir churchId do JWT, guard ou query param; para usuários globais, aceitar ausência e marcar como 'GLOBAL'
    const explicitChurchId = req.query?.churchId || req.churchId;
    const churchId = req.user?.churchId || explicitChurchId;

    if (!userId || (!churchId && !isGlobal)) {
      throw new BadRequestException('Utilizador e igreja são obrigatórios');
    }

    if (!dto.events || !Array.isArray(dto.events)) {
      throw new BadRequestException('Events deve ser um array');
    }

    await this.auditService.logEventsBatch(
      dto.events,
      userId,
      churchId || 'GLOBAL',
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      count: dto.events.length,
      message: `${dto.events.length} eventos registados com sucesso`,
    };
  }
}
