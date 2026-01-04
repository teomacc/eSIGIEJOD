import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * ENUM - Tipos de Fundos Financeiros
 * 
 * Sistema organiza dinheiro em 10 fundos para evitar mistura e desvios
 * Cada transação deve especificar exatamente qual fundo afeta
 * 
 * Exemplos de uso:
 * - Dízimo → normalmente vai para Fundo Geral
 * - Oferta para missões → vai para Fundo de Missões
 * - Oferta para construção → vai para Fundo de Construção
 */
export const FundType = {
  GENERAL: 'FUNDO_GERAL',
  CONSTRUCTION: 'FUNDO_CONSTRUCAO',
  MISSIONS: 'FUNDO_MISSOES',
  SOCIAL: 'FUNDO_SOCIAL',
  EVENTS: 'FUNDO_EVENTOS',
  EMERGENCY: 'FUNDO_EMERGENCIA',
  SPECIAL_PROJECTS: 'FUNDO_PROJECTOS_ESPECIAIS',
  YOUTH: 'FUNDO_JUVENTUDE',
  WOMEN: 'FUNDO_MULHERES',
  MAINTENANCE: 'FUNDO_MANUTENCAO',
};

export type FundType = typeof FundType[keyof typeof FundType];

/**
 * ENTIDADE - Fundo Financeiro
 * 
 * Responsabilidade: Armazenar definição de fundo e seu saldo atual
 * 
 * Conceito importante:
 * - Balance é DENORMALIZADO: calculado apenas como soma de entradas
 * - Atualizado transacionalmente quando nova entrada é criada
 * - Sempre reflete soma correta de todas as entradas do fundo
 * 
 * Fluxo de Atualização de Saldo:
 * 1. Ao criar nova entrada Income com fundId X
 * 2. FinancesService incrementa Fund.balance com montante
 * 3. Operação é atômica (tudo sucede ou tudo falha)
 * 4. Mantém integridade de dados
 * 
 * Isolamento:
 * - churchId: Cada fund pertence a uma église
 * - Queries sempre filtram por churchId
 */
@Entity('funds')
export class Fund {
  // ID único (UUID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID da église (isolamento de dados)
  // Cada fund pertence a exatamente uma église
  @Column('uuid')
  churchId!: string;

  // Tipo de fundo
  // Exemplo: FUNDO_GERAL, FUNDO_CONSTRUCAO, etc.
  @Column('varchar')
  type!: FundType;

  // Saldo atual do fundo
  // IMPORTANTE: Calculado como soma de todas as entradas
  // Tipo: decimal(15, 2) = máximo 999.999.999.999,99 MT
  // Precisão: 2 casas decimais (centavos)
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance!: number;

  // Descrição opcional do fundo
  @Column('text', { nullable: true })
  description?: string;

  // Flag: fundo está ativo?
  // Permite "desativar" fundos sem deletar do BD
  @Column({ default: true })
  isActive!: boolean;

  // Timestamp: Quando foi criado
  @CreateDateColumn()
  createdAt!: Date;

  // Timestamp: Última actualização
  @UpdateDateColumn()
  updatedAt!: Date;
}
