import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';

/**
 * SERVIÇO DE AUDITORIA (AuditService)
 * 
 * Responsabilidade: Gerir logs imutáveis de auditoria
 * 
 * Métodos principais:
 * 1. logAction() - Criar novo log de auditoria (ÚNICO método de escrita)
 * 2. getAuditLogsByChurch() - Consultar logs de uma igreja
 * 3. getAuditLogsForEntity() - Histórico de uma entidade específica
 * 4. getAuditLogsByAction() - Filtrar por tipo de ação
 * 5. getAuditLogsByUser() - Ações realizadas por um usuário
 * 
 * IMPORTANTE - SEGURANÇA:
 * - NÃO há métodos para DELETE ou UPDATE
 * - Logs são imutáveis permanentemente
 * - Se criar log errado, criar NOVO log de correção
 * 
 * Padrão de Uso:
 * 1. Em cada operação importante, chamar logAction()
 * 2. Passar userId (de req.user), action, entityId, changes
 * 3. Sistema registra tudo automaticamente
 * 4. Histórico completo fica permanentemente
 * 
 * Exemplo de Fluxo:
 * // 1. Usuário aprova requisição
 * const requisition = await requisitionsService.approve(id, data, req.user);
 * 
 * // 2. Service chama AuditService
 * await auditService.logAction({
 *   churchId: req.user.churchId,
 *   userId: req.user.userId,
 *   action: AuditAction.REQUISITION_APPROVED,
 *   entityId: id,
 *   entityType: 'Requisition',
 *   changes: { previousState: 'UNDER_REVIEW', newState: 'APPROVED' }
 * });
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * REGISTAR AÇÃO - Criar log imutável
   * 
   * ÚNICA operação de escrita (CREATE) no audit
   * 
   * Parâmetros:
   * - churchId: ID da iglesia (isolamento)
   * - userId: ID do usuário que realizou ação
   * - action: Tipo de ação (enum AuditAction)
   * - entityId: ID da entidade afectada (optional)
   * - entityType: Tipo de entidade (optional)
   * - changes: Dados que mudaram (optional)
   * - description: Descrição legível (optional)
   * - metadata: Contexto adicional (optional)
   * 
   * Retorna:
   * - AuditLog criado
   * 
   * Fluxo:
   * 1. Criar AuditLog entity com dados
   * 2. Salvar no BD (operação CREATE)
   * 3. Retornar log criado
   * 4. Log é permanente e imutável
   * 
   * Exemplo de Uso:
   * await auditService.logAction({
   *   churchId: req.user.churchId,
   *   userId: req.user.userId,
   *   action: AuditAction.INCOME_RECORDED,
   *   entityId: income.id,
   *   entityType: 'Income',
   *   changes: {
   *     amount: 5000,
   *     fundId: fundId,
   *     type: 'DIZIMO'
   *   },
   *   description: 'Entrada de dízimo registada',
   *   metadata: {
   *     ip: req.ip,
   *     userAgent: req.get('user-agent')
   *   }
   * });
   */
  async logAction(data: {
    churchId: string;
    userId: string;
    action: AuditAction;
    entityId?: string;
    entityType?: string;
    changes?: any;
    description?: string;
    metadata?: any;
  }): Promise<AuditLog> {
    // Criar entidade AuditLog
    const log = this.auditLogRepository.create(data);

    // Salvar no BD (operação CREATE - imutável)
    return this.auditLogRepository.save(log);
  }

  /**
   * OBTER LOGS DA IGLESIA
   * 
   * Parâmetros:
   * - churchId: ID da iglesia
   * - limit: Número máximo de resultados (padrão 100)
   * - offset: Deslocamento para pagination (padrão 0)
   * 
   * Retorna:
   * - Tuple: [array de logs, total de registos]
   * 
   * Fluxo:
   * 1. Query BD filtrando por churchId
   * 2. Ordenar por createdAt DESC (mais recente primeiro)
   * 3. Aplicar limit/offset para pagination
   * 4. Retornar resultados
   * 
   * Uso:
   * const [logs, total] = await auditService.getAuditLogsByChurch(churchId, 50, 0);
   * console.log(`Mostrando ${logs.length} de ${total} registos`);
   */
  async getAuditLogsByChurch(
    churchId: string,
    limit: number = 100,
    offset: number = 0,
    action?: string,
    userId?: string,
  ): Promise<[AuditLog[], number]> {
    const where: any = { churchId };
    
    if (action) {
      where.action = action;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    // findAndCount retorna [items, total]
    return this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' }, // Mais recente primeiro
      take: limit,
      skip: offset,
    });
  }

  /**
   * OBTER HISTÓRICO DE ENTIDADE
   * 
   * Parâmetro:
   * - entityId: ID da entidade
   * 
   * Retorna:
   * - Array de todos os logs relacionados a esta entidade
   * 
   * Fluxo:
   * 1. Procurar todos logs com este entityId
   * 2. Ordenar por createdAt ASC (ordem cronológica)
   * 3. Retornar histórico completo
   * 
   * Uso:
   * const history = await auditService.getAuditLogsForEntity(requisitionId);
   * // Mostra: CREATED → UNDER_REVIEW → APPROVED → EXECUTED
   * // Com timestamps e quem fez cada ação
   * 
   * Importante: Mostra TODAS as ações numa entidade
   * Útil para auditar ciclo completo de uma requisição
   */
  async getAuditLogsForEntity(entityId: string): Promise<AuditLog[]> {
    // Procurar todos logs desta entidade
    return this.auditLogRepository.find({
      where: { entityId },
      order: { createdAt: 'ASC' }, // Ordem cronológica (primeira ação primeiro)
    });
  }

  /**
   * OBTER LOGS POR AÇÃO
   * 
   * Parâmetros:
   * - churchId: Isolamento por iglesia
   * - action: Tipo de ação a filtrar
   * 
   * Retorna:
   * - Array de logs desta ação
   * 
   * Fluxo:
   * 1. Filtrar por churchId (isolamento)
   * 2. Filtrar por action
   * 3. Ordenar por createdAt DESC
   * 4. Retornar resultados
   * 
   * Uso:
   * const approvals = await auditService.getAuditLogsByAction(
   *   churchId,
   *   AuditAction.REQUISITION_APPROVED
   * );
   * // Mostra todas as requisições aprovadas
   * 
   * Útil para:
   * - Análise de tendências
   * - Relatórios por tipo de ação
   * - Auditorias periódicas
   */
  async getAuditLogsByAction(
    churchId: string,
    action: AuditAction,
  ): Promise<AuditLog[]> {
    // Procurar logs desta ação, nesta iglesia
    return this.auditLogRepository.find({
      where: { churchId, action },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * OBTER LOGS DE USUÁRIO
   * 
   * Parâmetros:
   * - churchId: Isolamento por iglesia
   * - userId: ID do usuário
   * 
   * Retorna:
   * - Array de ações realizadas por este usuário
   * 
   * Fluxo:
   * 1. Filtrar por churchId (isolamento)
   * 2. Filtrar por userId
   * 3. Ordenar por createdAt DESC
   * 4. Retornar histórico do usuário
   * 
   * Uso:
   * const userActions = await auditService.getAuditLogsByUser(
   *   churchId,
   *   userId
   * );
   * // Mostra tudo que este usuário fez
   * 
   * Importante para:
   * - Monitorar ações específicas de um usuário
   * - Investigar atividade suspeita
   * - Auditar usuários específicos
   */
  async getAuditLogsByUser(
    churchId: string,
    userId: string,
  ): Promise<AuditLog[]> {
    // Procurar ações deste usuário, nesta iglesia
    return this.auditLogRepository.find({
      where: { churchId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * OBTER LOGS POR PERÍODO
   * 
   * Parâmetros:
   * - churchId: Isolamento por iglesia
   * - startDate: Data início
   * - endDate: Data fim
   * 
   * Retorna:
   * - Array de logs do período
   * 
   * Fluxo:
   * 1. Query com WHERE createdAt BETWEEN startDate AND endDate
   * 2. Ordenar por createdAt
   * 3. Retornar resultados
   * 
   * Uso:
   * const monthlyAudit = await auditService.getAuditLogsByPeriod(
   *   churchId,
   *   new Date('2024-01-01'),
   *   new Date('2024-01-31')
   * );
   * // Auditoria mensal
   */
  async getAuditLogsByPeriod(
    churchId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<AuditLog[]> {
    // QueryBuilder para intervalo de datas
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.churchId = :churchId', { churchId })
      .andWhere('log.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('log.createdAt', 'DESC')
      .getMany();
  }

  /**
   * CONTAR LOGS POR AÇÃO
   * 
   * Útil para estatísticas
   * Exemplo: "150 requisições aprovadas este mês"
   */
  async countByAction(
    churchId: string,
    action: AuditAction,
  ): Promise<number> {
    return this.auditLogRepository.count({
      where: { churchId, action },
    });
  }

  /**
   * REGISTAR MÚLTIPLOS EVENTOS EM BATCH
   * 
   * Recebido do frontend em batch
   * 
   * Parâmetros:
   * - events: Array de eventos do frontend
   * - userId: ID do utilizador que gerou eventos
   * - churchId: ID da igreja
   * - ip: Endereço IP do cliente
   * - userAgent: User agent do navegador
   * 
   * Fluxo:
   * 1. Receber batch de eventos
   * 2. Processar cada evento
   * 3. Enriquecer com contexto (userId, churchId, ip, userAgent)
   * 4. Salvar na BD
   */
  async logEventsBatch(
    events: any[],
    userId: string,
    churchId: string,
    ip: string,
    userAgent: string,
  ): Promise<void> {
    const logs = events.map(event => {
      const log = new AuditLog();
      log.churchId = churchId;
      log.userId = userId;
      log.action = event.action || 'UNKNOWN';
      log.entityId = event.entityId;
      log.entityType = event.entityType;
      log.changes = event.changes;
      log.description = event.description;
      log.metadata = {
        ...event.metadata,
        ip,
        userAgent,
      };

      return log;
    });

    if (logs.length > 0) {
      await this.auditLogRepository.save(logs);
    }
  }

  /**
   * Verificar se string é um UUID válido
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Obter utilizador por ID (para enriquecimento de logs)
   */
  async getUserById(userId: string): Promise<any> {
    try {
      const userRepository = this.auditLogRepository.manager.connection.getRepository('User');
      return await userRepository.findOne({
        where: { id: userId },
        select: ['id', 'email', 'username'],
      });
    } catch (error) {
      return null;
    }
  }

  /**
   * Obter utilizador por email ou username
   */
  async getUserByEmailOrUsername(emailOrUsername: string): Promise<any> {
    try {
      const userRepository = this.auditLogRepository.manager.connection.getRepository('User');
      return await userRepository.findOne({
        where: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
        select: ['id', 'email', 'username'],
      });
    } catch (error) {
      return null;
    }
  }
}

