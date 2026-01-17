import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * ENTIDADE - Movimento Financeiro
 * 
 * Responsabilidade: Registar cada movimento que afeta saldo de um fundo
 * 
 * Serve para:
 * 1. Auditoria detalhada (cada entrada/saída é rastreada)
 * 2. Cálculo de saldo (soma de movimentos = saldo atual)
 * 3. Relatórios por período
 * 4. Validação de limites (diário/mensal)
 * 5. Rastreamento de origem/destino
 * 
 * Tipos de Movimento:
 * - ENTRADA: Receita registada (revenue dividida entre fundos)
 * - SAIDA: Despesa executada
 * - AJUSTE: Correção manual autorizada
 * 
 * Referência:
 * MovimentoFinanceiro aponta para a origem do movimento:
 * - ENTRADA → referencia um RevenueFund (alocação)
 * - SAIDA → referencia uma Despesa
 * - AJUSTE → referencia um UUID genérico com justificativa
 * 
 * Isolamento por Igreja:
 * - churchId: Cada movimento pertence a uma igreja
 * - fundId: Afeta um fundo específico
 * - Queries sempre filtram por churchId
 * 
 * Exemplo de fluxo:
 * 1. Receita de 5.000 MT é registada
 * 2. Sistema cria MovimentoFinanceiro ENTRADA de 5.000 MT para Fundo Geral
 * 3. Saldo do Fundo Geral sobe para 25.000 MT
 * 4. Despesa de 2.000 MT é executada
 * 5. Sistema cria MovimentoFinanceiro SAIDA de 2.000 MT para Fundo Geral
 * 6. Saldo do Fundo Geral baixa para 23.000 MT
 */
@Entity('movimentos_financeiros')
@Index(['churchId', 'dataMovimento'])
@Index(['fundId', 'dataMovimento'])
@Index(['tipo'])
@Index(['referenciaId'])
export class MovimentoFinanceiro {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * ID da Igreja (isolamento)
   */
  @Column('uuid')
  churchId!: string;

  /**
   * ID do Fundo afectado
   */
  @Column('uuid')
  fundId!: string;

  /**
   * Tipo de Movimento
   * 
   * ENTRADA: Receita ou transferência para dentro do fundo
   * SAIDA: Despesa ou transferência para fora do fundo
   * AJUSTE: Correção manual (pode ser entrada ou saída conforme amount)
   */
  @Column('varchar')
  tipo!: 'ENTRADA' | 'SAIDA' | 'AJUSTE';

  /**
   * Valor do Movimento (em MT)
   * 
   * ENTRADA: Positivo
   * SAIDA: Positivo (sistema aplica lógica: saldo -= valor)
   * AJUSTE: Pode ser positivo (crédito) ou negativo (débito)
   * 
   * O saldo é calculado como:
   * saldo = SUM(amount WHERE tipo='ENTRADA') - SUM(amount WHERE tipo='SAIDA') + SUM(amount WHERE tipo='AJUSTE')
   */
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  valor!: number;

  /**
   * ID que referencia a origem do movimento
   * 
   * Tipo de referência depende do campo `referenciaTipo`
   * - REVENUE_FUND: ID do RevenueFund (alocação)
   * - EXPENSE: ID da Despesa
   * - ADJUSTMENT: UUID genérico com justificativa em descricao
   */
  @Column('uuid')
  referenciaId!: string;

  /**
   * Tipo de Referência
   * 
   * Especifica qual entidade é a origem do movimento
   */
  @Column('varchar')
  referenciaTipo!: 'REVENUE_FUND' | 'EXPENSE' | 'ADJUSTMENT';

  /**
   * Data do Movimento
   * 
   * Para ENTRADA: Data da receita (pode ser passada)
   * Para SAIDA: Data do pagamento
   * Para AJUSTE: Data do ajuste
   */
  @Column('date')
  dataMovimento!: Date;

  /**
   * Quem criou o movimento
   * 
   * ENTRADA: ReceitasService (sistema)
   * SAIDA: ExecutionService (quem executou a despesa)
   * AJUSTE: Admin/Director (humano)
   */
  @Column('uuid')
  criadoPor!: string;

  /**
   * Descrição do Movimento
   * 
   * Exemplo:
   * - "Receita de Dízimo"
   * - "Pagamento de água/eletricidade"
   * - "Ajuste manual - correção de erro anterior"
   */
  @Column('text', { nullable: true })
  descricao?: string;

  /**
   * Quando foi registado
   */
  @CreateDateColumn()
  criadoEm!: Date;

  /**
   * NOTA: NÃO há updatedAt porque MovimentoFinanceiro é IMUTÁVEL
   * Uma vez registado, é histórico permanente
   * Correções são NOVOS movimentos (tipo AJUSTE)
   */
}
