import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * ENUM - Ações de Auditoria
 * 
 * Define os tipos de ações que são registadas no sistema
 * 
 * Cada ação é registada com:
 * - userId: Quem fez
 * - timestamp: Quando
 * - entityId: Que entidade foi afectada
 * - changes: Antes/depois dos dados
 */
export const AuditAction = {
  INCOME_RECORDED: 'INCOME_RECORDED',
  REVENUE_RECORDED: 'REVENUE_RECORDED',
  REQUISITION_CREATED: 'REQUISITION_CREATED',
  REQUISITION_APPROVED: 'REQUISITION_APPROVED',
  REQUISITION_REJECTED: 'REQUISITION_REJECTED',
  REQUISITION_EXECUTED: 'REQUISITION_EXECUTED',
  REQUISITION_CANCELLED: 'REQUISITION_CANCELLED',
  REQUISITION_ACKNOWLEDGED: 'REQUISITION_ACKNOWLEDGED',
  FUND_UPDATED: 'FUND_UPDATED',
  USER_LOGIN: 'USER_LOGIN',
  USER_CREATED: 'USER_CREATED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  REPORT_GENERATED: 'REPORT_GENERATED',
};

export type AuditAction = typeof AuditAction[keyof typeof AuditAction];

/**
 * ENTIDADE - Log de Auditoria
 * 
 * Responsabilidade: Armazenar registro imutável de uma ação no sistema
 * 
 * IMPORTANTE - IMUTABILIDADE:
 * - Logs NUNCA são atualizados (no updateColumn)
 * - Logs NUNCA são deletados
 * - Apenas operação permitida: CREATE (inserção)
 * - Implementação: Remover permissão UPDATE/DELETE no serviço
 * 
 * Índices:
 * - (churchId, createdAt): Consultas por período
 * - (entityId): Histórico de uma entidade
 * - (action): Filtrar por tipo de ação
 * - (userId): Ações de um usuário
 * 
 * Fluxo de Criação:
 * 1. Ação ocorre no sistema (ex: aprovar requisição)
 * 2. Controller/Service chama AuditService.logAction()
 * 3. AuditService cria AuditLog com detalhes
 * 4. Log é inserido no BD (imutável)
 * 5. Log pode ser consultado mas nunca modificado
 * 
 * Campos importantes:
 * - churchId: Isolamento por igreja
 * - userId: Responsabilidade (quem fez)
 * - action: Tipo de ação
 * - entityId: Qual entidade foi afectada
 * - changes: Antes/depois (para auditoria)
 * - metadata: Contexto adicional (IP, user agent, etc)
 */
@Entity('audit_logs')
@Index(['churchId', 'createdAt']) // Consultas por período
@Index(['entityId']) // Histórico de entidade
@Index(['action']) // Filtrar por ação
@Index(['userId']) // Ações de um usuário
export class AuditLog {
  // ID único (UUID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID da iglesia (isolamento de dados)
  // Mesmo em auditoria, isolar por iglesia
  @Column('uuid')
  churchId!: string;

  // ID do usuário que realizou a ação
  // Responsabilidade: quem fez o quê
  @Column('uuid')
  userId!: string;

  // Tipo de ação realizada
  // Uma das ações definidas no enum acima
  @Column('varchar')
  action!: AuditAction;

  // ID da entidade afectada (optional)
  // Exemplo: ID da requisição que foi aprovada
  // Null se ação não afecta entidade específica (ex: USER_LOGIN)
  @Column('uuid', { nullable: true })
  entityId?: string;

  // Tipo de entidade afectada
  // Exemplo: 'Requisition', 'Income', 'Fund'
  // Ajuda a identificar que tipo de entidade foi afectada
  @Column('text', { nullable: true })
  entityType?: string;

  // Dados que foram alterados
  // Formato JSON com antes/depois
  // Exemplo:
  // {
  //   "previousState": "PENDING",
  //   "newState": "APPROVED",
  //   "approvedAmount": 15000,
  //   "approvedBy": "uuid..."
  // }
  @Column('jsonb', { nullable: true })
  changes: any;

  // Descrição legível da ação
  // Exemplo: "Requisição REQ-001 aprovada por João Silva"
  // Ajuda na auditoria manual
  @Column('text', { nullable: true })
  description?: string;

  // Metadados adicionais (contexto)
  // JSON com informações extras:
  // - IP: Endereço IP do usuário
  // - userAgent: Navegador/cliente
  // - location: Localização (se aplicável)
  // - deviceInfo: Informações do dispositivo
  @Column('jsonb', { nullable: true })
  metadata?: any;

  // Timestamp: Quando foi criado
  // ÚNICO timestamp: logs são imutáveis
  @CreateDateColumn()
  createdAt!: Date;

  // NOTA: NÃO há UpdatedAt
  // Logs de auditoria NUNCA são atualizados
  // Se precisar corrigir, criar NOVO log com correção
}
