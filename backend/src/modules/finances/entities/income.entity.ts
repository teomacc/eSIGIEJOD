import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * ENUM - Tipos de Entrada de Dinheiro
 * 
 * Define todas as formas que dinheiro pode entrar na igreja
 * 
 * Exemplos:
 * - DIZIMO: Dízimo dos membros (usual 10% dos rendimentos)
 * - OFERTA_NORMAL: Oferta no culto
 * - OFERTA_ESPECIAL: Oferta para um fim específico
 * - DONATIVO_EXTERNO: Doação de pessoa/organização externa
 * - TRANSFERENCIA_IGREJAS: De outra igreja da rede
 * - AJUSTE_AUTORIZADO: Correcção de erro anterior (novo registro, não update)
 */
export enum IncomeType {
  TITHE = 'DIZIMO', // Dízimo
  OFFERING = 'OFERTA_NORMAL', // Oferta normal
  SPECIAL_OFFERING = 'OFERTA_ESPECIAL', // Oferta especial
  DESIGNATED_OFFERING = 'OFERTA_DIRECCIONADA', // Oferta para fundo específico
  MONTHLY_CONTRIBUTION = 'CONTRIBUICAO_MENSAL', // Contribuição mensal
  EXTERNAL_DONATION = 'DONATIVO_EXTERNO', // Doação externa
  INTER_CHURCH_TRANSFER = 'TRANSFERENCIA_IGREJAS', // De outra igreja
  AUTHORIZED_ADJUSTMENT = 'AJUSTE_AUTORIZADO', // Ajuste autorizado
}

/**
 * ENTIDADE - Entrada de Dinheiro
 * 
 * Responsabilidade: Registro IMUTÁVEL de dinheiro que entrou
 * 
 * IMPORTANTE - PRINCÍPIO DE IMUTABILIDADE:
 * - Entradas NUNCA são deletadas
 * - Entradas NUNCA são modificadas
 * - Correcções são feitas criando NOVA entrada de ajuste (AJUSTE_AUTORIZADO)
 * - Isto garante rastreamento completo e impossibilidade de cobertura de fraudes
 * 
 * Fluxo de Criação:
 * 1. Tesoureiro chama POST /finances/income
 * 2. Envia: { fundId, type, amount, date, observations }
 * 3. FinancesService cria Income entity
 * 4. FinancesService incrementa Fund.balance
 * 5. AuditService.logAction() registra criação
 * 6. Entrada é permanente (imutável)
 * 
 * Fluxo de Correcção:
 * 1. Se erro anterior, não deletar entrada
 * 2. Criar NOVA entrada de ajuste negativo (amount negativo)
 * 3. Ambas as entradas ficam registadas
 * 4. Audit trail mostra ambas operações
 * 5. Completa transparência
 * 
 * Isolamento por Igreja:
 * - churchId: Cada entrada pertence a uma église
 * - Queries sempre filtram por churchId
 * - Sem mistura de dados entre igrejas
 */
@Entity('income')
export class Income {
  // ID único (UUID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID da église (isolamento de dados)
  @Column('uuid')
  churchId!: string;

  // ID do fundo (qual fundo recebe este dinheiro)
  @Column('uuid')
  fundId!: string;

  // ID do usuário que registou (responsabilidade)
  // Permite auditar quem fez cada ação
  @Column('uuid')
  recordedBy!: string;

  // Tipo de entrada
  // Exemplo: DIZIMO, OFERTA_NORMAL, DONATIVO_EXTERNO
  @Column('enum', { enum: IncomeType })
  type!: IncomeType;

  // Montante recebido
  // Tipo: decimal(15, 2) = até 999.999.999.999,99
  // Precisão: 2 casas decimais (centavos)
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  // Data da entrada (quando dinheiro foi recebido)
  // Pode ser diferente de createdAt (data de registro)
  @Column('date')
  date!: Date;

  // Observações livres sobre a entrada
  // Exemplo: "Dízimo de João Silva", "Oferta para construção"
  @Column('text', { nullable: true })
  observations?: string;

  // Anexos (fotos, recibos, facturas)
  // Formato: JSON array de caminhos de ficheiros
  // Exemplo: '["uploads/recibo_001.pdf", "uploads/foto_001.jpg"]'
  @Column('text', { nullable: true })
  attachments?: string;

  // Timestamp: Quando foi registada (criada)
  // ÚNICO timestamp: EntidadeImutável nunca é atualizada
  @CreateDateColumn()
  createdAt!: Date;

  // NOTA: NÃO há updatedAt porque Income é IMUTÁVEL
  // Uma vez criada, nunca é modificada
  // Correcções são NOVAS entradas
}
