import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, JoinColumn, ManyToOne, Index } from 'typeorm';
import { Requisition } from '../../requisitions/entities/requisition.entity';

/**
 * ENTIDADE - Despesa
 * 
 * Responsabilidade: Registar despesa realizada (saída de dinheiro)
 * 
 * IMPORTANTE - Momento de Criação:
 * A Despesa NÃO é criada quando a requisição é aprovada.
 * Ela só é criada quando a requisição é EXECUTADA (dinheiro sai efetivamente).
 * 
 * Fluxo:
 * 1. Obreiro cria requisição de 1.000 MT (sem criar Despesa)
 * 2. Líder Financeiro aprova (ainda sem Despesa)
 * 3. Líder Financeiro executa (paga) → AGORA cria Despesa
 * 4. MovimentoFinanceiro SAIDA é registado simultaneamente
 * 5. Saldo do fundo é reduzido
 * 
 * Por que assim?
 * - Requisição aprovada ≠ Dinheiro já saiu
 * - Despesa = comprovação que saída aconteceu
 * - Separa "planejado" (requisição) de "realizado" (despesa)
 * - Facilita auditoria e rastreamento
 * 
 * Relação com Requisição:
 * - Uma Requisição pode ter no máximo uma Despesa
 * - Uma Despesa sempre referencia uma Requisição
 * - Se requisição é cancelada → Despesa nunca é criada
 * 
 * Isolamento por Igreja:
 * - churchId: Cada despesa pertence a uma igreja
 * - fundId: Afeta um fundo específico
 * - Queries sempre filtram por churchId
 */
@Entity('despesas')
@Index(['churchId', 'dataPagamento'])
@Index(['requisicaoId'])
@Index(['fundId'])
export class Despesa {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * ID da Requisição que originou esta Despesa
   * 
   * Relacionamento 1:1 (uma requisição → uma despesa)
   * Essencial para auditoria e rastreamento
   */
  @Column('uuid')
  requisicaoId!: string;

  @ManyToOne(() => Requisition, { nullable: false })
  @JoinColumn({ name: 'requisicaoId' })
  requisicao!: Requisition;

  /**
   * ID da Igreja (isolamento)
   */
  @Column('uuid')
  churchId!: string;

  /**
   * ID do Fundo que sofre a saída
   * 
   * Deve corresponder ao fundId da Requisição
   * Confirmado na criação de Despesa
   */
  @Column('uuid')
  fundId!: string;

  /**
   * Valor da Despesa (em MT)
   * 
   * Normalmente igual ao approvedAmount da Requisição
   * Mas pode ser diferente se execução for parcial
   * (exemplo: requisição 1000, execução de 800)
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valor!: number;

  /**
   * Data do Pagamento (quando dinheiro saiu)
   * 
   * Diferente de createdAt (quando Despesa foi registada)
   * Importante para rastreamento temporal e relatórios
   */
  @Column('date')
  dataPagamento!: Date;

  /**
   * Quem executou o pagamento
   * 
   * Normalmente Líder Financeiro
   * Rastreado para auditoria
   */
  @Column('uuid')
  executadoPor!: string;

  /**
   * Comprovativo do pagamento (opcional)
   * 
   * URL/caminho para:
   * - Recibo de banco
   * - Comprovativo de transferência
   * - Nota fiscal
   * - Foto de entrega
   * 
   * Pode ser múltiplo (JSONB array) em futuro
   */
  @Column('text', { nullable: true })
  comprovativoUrl?: string;

  /**
   * Observações sobre a Despesa
   * 
   * Exemplo:
   * - "Transferência bancária ref: ABC123"
   * - "Pagamento em espécie, assinado"
   * - "Parcial, faltam 200 MT"
   */
  @Column('text', { nullable: true })
  observacoes?: string;

  /**
   * Quando foi registada (sistema)
   * 
   * ÚNICO timestamp: Despesa é imutável após criação
   */
  @CreateDateColumn()
  criadoEm!: Date;

  /**
   * NOTA: NÃO há updatedAt porque Despesa é IMUTÁVEL
   * Uma vez criada (pagamento realizado), nunca é modificada
   * Correções são NOVAS Despesas (ajustes)
   */
}
