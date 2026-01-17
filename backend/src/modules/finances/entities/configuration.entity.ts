import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * ENTIDADE - Configuração Financeira
 * 
 * Responsabilidade: Armazenar limites e regras financeiras por igreja ou globalmente
 * 
 * Isolamento:
 * - churchId: NULL = regra global (aplicável a todas as igrejas)
 * - churchId: UUID = regra específica da igreja (sobrescreve global)
 * 
 * Limites configuráveis:
 * - limiteMaxPorRequisicao: Valor máximo por requisição (acima → requer aprovação adicional)
 * - limiteDiario: Total máximo de despesas por dia
 * - limiteMensal: Total máximo de despesas por mês
 * - exigeAprovadorNivel2: Se requerido director/admin para maiores valores
 * - exigeNotificacaoPastorObreiro: Se pastor precisa ser notificado de requisições de obreiros
 * 
 * Exemplo de uso:
 * 1. Igreja local configura: limiteMaxPorRequisicao = 50.000 MT
 * 2. Obreiro faz requisição de 100.000 MT
 * 3. Sistema detecta que ultrapassa limite → marca para aprovação director
 * 4. Se notificação ativa → pastor recebe notificação (sem bloquear aprovação local)
 * 
 * Precedência:
 * 1. Procurar configuração específica da igreja
 * 2. Se não encontrar, usar configuração global (churchId = NULL)
 * 3. Se nenhuma existir, usar valores padrão hard-coded no código
 */
@Entity('configuracoes_financeiras')
@Index(['churchId'])
export class ConfiguracaoFinanceira {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * ID da Igreja
   * NULL = configuração global (aplica-se a todas as igrejas)
   * UUID = configuração específica para esta igreja
   */
  @Column('uuid', { nullable: true })
  churchId?: string;

  /**
   * Limite máximo por requisição (em MT)
   * 
   * Exemplo: 50.000
   * 
   * Se requisição > este valor:
   * - Requer aprovação director (exigeAprovadorNivel2)
   * - Ou simplesmente não permite se director não existir
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 50000 })
  limiteMaxPorRequisicao!: number;

  /**
   * Limite diário para despesas (em MT)
   * 
   * Exemplo: 500.000
   * 
   * Total de execuções em um dia não pode ultrapassar este valor
   * Usado para validação em tempo de execução
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 500000 })
  limiteDiario!: number;

  /**
   * Limite mensal para despesas (em MT)
   * 
   * Exemplo: 5.000.000
   * 
   * Total de execuções em um mês não pode ultrapassar este valor
   * Rastreado por MovimentoFinanceiro
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 5000000 })
  limiteMensal!: number;

  /**
   * Requer aprovador nível 2?
   * 
   * TRUE = requisições acima do limite precisam aprovação adicional (Director)
   * FALSE = apenas líder financeiro aprova
   */
  @Column({ type: 'boolean', default: true })
  exigeAprovadorNivel2!: boolean;

  /**
   * Notificar pastor de requisições de obreiro?
   * 
   * TRUE = requisição de obreiro envia notificação ao pastor (sem bloquear)
   * FALSE = apenas líder financeiro aprova (pastor não é notificado)
   * 
   * Usado para transparência e conhecimento pastoral
   */
  @Column({ type: 'boolean', default: true })
  exigeNotificacaoPastorObreiro!: boolean;

  /**
   * Quem criou/alterou esta configuração
   */
  @Column('uuid', { nullable: true })
  criadoPor?: string;

  @Column('uuid', { nullable: true })
  alteradoPor?: string;

  /**
   * Timestamps
   */
  @CreateDateColumn()
  criadoEm!: Date;

  @UpdateDateColumn()
  alteradoEm!: Date;

  /**
   * Notas/Observações
   */
  @Column('text', { nullable: true })
  observacoes?: string;
}
