import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * ENUM - Estados da Requisição
 * 
 * Define ciclo de vida de uma requisição de despesa
 * 
 * Fluxo correto (máquina de estados):
 * PENDING → UNDER_REVIEW → APPROVED/REJECTED → EXECUTED/CANCELLED
 * 
 * Não é permitido pular estados (ex: PENDING diretamente para APPROVED)
 * Sistema valida transições em requisitions.service.ts
 */
export const RequisitionState = {
  PENDING: 'PENDENTE',
  UNDER_REVIEW: 'EM_ANALISE',
  APPROVED: 'APROVADA',
  REJECTED: 'REJEITADA',
  CANCELLED: 'CANCELADA',
  EXECUTED: 'EXECUTADA',
};

export type RequisitionState = typeof RequisitionState[keyof typeof RequisitionState];

/**
 * ENUM - Categorias de Despesa
 * 
 * Define os 16 tipos de despesas possíveis
 * Cada requisição deve ter uma categoria
 * 
 * Usado para:
 * 1. Classificar despesa
 * 2. Gerar relatórios por categoria
 * 3. Definir limites por categoria
 */
export const ExpenseCategory = {
  FOOD: 'ALIMENTACAO',
  TRANSPORT: 'TRANSPORTE',
  ACCOMMODATION: 'HOSPEDAGEM',
  OFFICE_MATERIAL: 'MATERIAL_ESCRITORIO',
  LITURGICAL_MATERIAL: 'MATERIAL_LITURGICO',
  EQUIPMENT: 'EQUIPAMENTOS',
  MAINTENANCE: 'MANUTENCAO',
  SOCIAL_SUPPORT: 'APOIO_SOCIAL',
  EVENT_ORGANIZATION: 'ORGANIZACAO_EVENTOS',
  TRAINING: 'FORMACAO_SEMINARIOS',
  HEALTH_EMERGENCY: 'SAUDE_EMERGENCIA',
  MISSIONARY_PROJECTS: 'PROJECTOS_MISSIONARIOS',
  COMMUNICATION: 'COMUNICACAO',
  ENERGY_WATER: 'ENERGIA_AGUA',
  FUEL: 'COMBUSTIVEL',
  OTHER: 'OUTROS',
};

export type ExpenseCategory = typeof ExpenseCategory[keyof typeof ExpenseCategory];

/**
 * ENUM - Magnitude da Requisição
 * 
 * Classifica a requisição por tamanho
 * Usado para determinar nível de aprovação automático
 * 
 * Fórmula:
 * ≤ 5.000 MT → SMALL (Pequena)
 * 5.001 – 20.000 MT → MEDIUM (Média)
 * 20.001 – 50.000 MT → LARGE (Grande)
 * > 50.000 MT → CRITICAL (Crítica)
 * 
 * Exemplo:
 * Requisição de 15.000 MT → MEDIUM → Precisa aprovação DIRECTOR
 * Requisição de 60.000 MT → CRITICAL → Precisa aprovação PASTOR
 */
export const RequisitionMagnitude = {
  SMALL: 'PEQUENA',
  MEDIUM: 'MEDIA',
  LARGE: 'GRANDE',
  CRITICAL: 'CRITICA',
};

export type RequisitionMagnitude = typeof RequisitionMagnitude[keyof typeof RequisitionMagnitude];

/**
 * ENTIDADE - Requisição de Despesa
 * 
 * Responsabilidade: Armazenar dados de uma requisição de despesa e rastrear seu ciclo de vida
 * 
 * Conceito-chave - RASTREAMENTO COMPLETO:
 * - Cada requisição tem código único imutável
 * - Valores solicitado E aprovado são registados
 * - Quem criou, quem aprovou, quando - tudo registado
 * - Audit log mantém histórico completo
 * 
 * Fluxo de Ciclo de Vida:
 * 1. Criada em estado PENDING
 * 2. Magnitude é calculada automaticamente
 * 3. Nível de aprovação determinado (pelo ApprovalService)
 * 4. Enviada para aprovador (UNDER_REVIEW)
 * 5. Aprovador revisa e aprova/rejeita
 * 6. Se aprovada, transita para EXECUTED
 * 7. Cada transição é registada no AuditLog
 * 
 * Isolamento por Igreja:
 * - churchId: Cada requisição pertence a uma igreja
 * - fundId: Afecta um fundo específico
 * - Queries sempre filtram por churchId
 */
@Entity('requisitions')
export class Requisition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  churchId!: string;

  @Column()
  fundId!: string;

  @Column()
  requestedBy!: string;

  @Column({ nullable: true })
  approvedBy!: string;

  @Column({
    type: 'enum',
    enum: ExpenseCategory,
  })
  category!: ExpenseCategory;

  @Column('decimal', { precision: 10, scale: 2 })
  requestedAmount!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  approvedAmount!: number;

  @Column({
    type: 'enum',
    enum: RequisitionMagnitude,
  })
  magnitude!: RequisitionMagnitude;

  @Column({
    type: 'enum',
    enum: RequisitionState,
    default: RequisitionState.PENDING,
  })
  state!: RequisitionState;

  @Column('text')
  justification!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  executedAt!: Date;

  /**
   * MÉTODOS DE LÓGICA DE NEGÓCIO
   * 
   * Estes métodos implementam regras do sistema
   * (podem ser movidos para serviço se ficarem complexos)
   */

  /**
   * Pode mudar de estado?
   * Valida se transição de estado é permitida
   */
  canTransitionTo(newState: RequisitionState): boolean {
    const allowedTransitions: { [key in RequisitionState]: RequisitionState[] } = {
      [RequisitionState.PENDING]: [RequisitionState.UNDER_REVIEW, RequisitionState.CANCELLED],
      [RequisitionState.UNDER_REVIEW]: [RequisitionState.APPROVED, RequisitionState.REJECTED, RequisitionState.CANCELLED],
      [RequisitionState.APPROVED]: [RequisitionState.EXECUTED, RequisitionState.CANCELLED],
      [RequisitionState.REJECTED]: [], // Fim do ciclo
      [RequisitionState.CANCELLED]: [], // Fim do ciclo
      [RequisitionState.EXECUTED]: [], // Fim do ciclo
    };

    return allowedTransitions[this.state]?.includes(newState) ?? false;
  }

  /**
   * Obter o montante final a pagar
   * Se aprovada, retorna approvedAmount (ou requestedAmount se não reduzido)
   * Se não aprovada, retorna null
   */
  getFinalAmount(): number | null {
    if (this.state !== RequisitionState.APPROVED) {
      return null;
    }
    return this.approvedAmount || this.requestedAmount;
  }
}
