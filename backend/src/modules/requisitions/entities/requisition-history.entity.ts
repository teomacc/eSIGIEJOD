import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * ENTIDADE - Histórico de Requisição
 * 
 * Responsabilidade: Registar cada mudança de estado da requisição
 * 
 * Serve para:
 * 1. Auditoria: quem mudou o quê e quando
 * 2. Rastreamento: ver evolução completa da requisição
 * 3. Notificações: saber quando pastor foi notificado
 * 4. Rejeições: guardar motivos de rejeição
 * 5. Análise: entender fluxo de aprovações
 * 
 * Registro imutável - cada mudança cria um novo registro em RequisicaoHistorico
 * 
 * Exemplo de histórico para uma requisição:
 * 1. PENDENTE → EM_ANALISE (obreiro criou, líder começou análise)
 * 2. EM_ANALISE → APROVADA (líder aprovou)
 * 3. APROVADA → EXECUTADA (líder pagou)
 * 
 * Outro exemplo com rejeição:
 * 1. PENDENTE → EM_ANALISE (obreiro criou)
 * 2. EM_ANALISE → REJEITADA (líder rejeitou com motivo: "falta justificativa")
 * 3. (obreiro corrige e cria nova requisição)
 * 
 * Isolamento:
 * - churchId: para queries rápidas
 * - requisicaoId: para seguir histórico de uma requisição
 */
@Entity('requisicoes_historico')
@Index(['requisicaoId'])
@Index(['churchId', 'criadoEm'])
export class RequisicaoHistorico {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * ID da Requisição que sofreu mudança
   */
  @Column('uuid')
  requisicaoId!: string;

  /**
   * ID da Igreja (isolamento)
   */
  @Column('uuid')
  churchId!: string;

  /**
   * Estado anterior (de onde veio)
   * 
   * Exemplo: PENDENTE
   */
  @Column('varchar', { nullable: true })
  estadoAnterior?: string;

  /**
   * Estado novo (para onde foi)
   * 
   * Exemplo: EM_ANALISE
   */
  @Column('varchar')
  estadoNovo!: string;

  /**
   * Quem fez a mudança
   * 
   * Exemplo: Líder Financeiro UUID
   */
  @Column('uuid')
  alteradoPor!: string;

  /**
   * Tipo de usuário que fez a mudança
   * 
   * LIDER_FINANCEIRO: Aprovação do líder
   * DIRECTOR: Aprovação do director
   * PASTOR: Conhecimento do pastor
   * SISTEMA: Ação automática (rara)
   * 
   * Usado para relatórios e análise de fluxos
   */
  @Column('varchar')
  tipoAlterador!: 'LIDER_FINANCEIRO' | 'DIRECTOR' | 'PASTOR' | 'SISTEMA';

  /**
   * Motivo/Comentário
   * 
   * Exemplos:
   * - Aprovação: "Aprovado. Fundo tem saldo suficiente."
   * - Rejeição: "Rejeitado. Valores não batem com recibos."
   * - Notificação: "Pastor notificado automaticamente."
   * - Execução: "Pagamento realizado via banco, ref ABC123."
   */
  @Column('text', { nullable: true })
  motivo?: string;

  /**
   * Dados adicionais (JSON)
   * 
   * Para guardar contexto sem precisar de mais colunas:
   * {
   *   "valorAprovado": 5000,
   *   "comprovativoUrl": "...",
   *   "dataExecucao": "2024-01-15",
   *   "nomeExecutante": "João da Silva"
   * }
   */
  @Column({ type: 'jsonb', nullable: true })
  metadados?: Record<string, any>;

  /**
   * Quando foi feita a mudança
   */
  @CreateDateColumn()
  criadoEm!: Date;

  /**
   * NOTA: NÃO há updatedAt porque RequisicaoHistorico é IMUTÁVEL
   * Cada mudança cria um novo registro
   * Sem atualizações, sem deleções
   */
}
