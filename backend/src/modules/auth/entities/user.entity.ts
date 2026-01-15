
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * ENUM - Papéis/Roles de Usuários
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PASTOR = 'PASTOR',
  DIRECTOR = 'DIRECTOR',
  TREASURER = 'TREASURER',
  AUDITOR = 'AUDITOR',
  OBREIRO = 'OBREIRO',
  VIEWER = 'VIEWER',
}

/**
 * ENUM - Sexo
 */
export enum Sexo {
  MASCULINO = 'MASCULINO',
  FEMININO = 'FEMININO',
}

/**
 * ENUM - Estado Civil
 */
export enum EstadoCivil {
  SOLTEIRO = 'SOLTEIRO',
  CASADO = 'CASADO',
  VIUVO = 'VIUVO',
  DIVORCIADO = 'DIVORCIADO',
}

/**
 * ENUM - Função Ministerial
 */
export enum FuncaoMinisterial {
  PASTOR = 'PASTOR',
  DIACONO = 'DIACONO',
  PRESBITERO = 'PRESBITERO',
  EVANGELISTA = 'EVANGELISTA',
  OBREIRO = 'OBREIRO',
  MEMBRO = 'MEMBRO',
}

/**
 * ENTIDADE - Usuário
 * 
 * Estrutura completa para gestão de membros e obreiros
 * 
 * Seções:
 * 1. Identificação Básica
 * 2. Informação Espiritual/Ministerial
 * 3. Contactos e Localização
 * 4. Dados de Acesso ao Sistema
 * 5. Responsabilidades Administrativas
 * 6. Auditoria e Controlo
 */
@Entity('users')
export class User {
  // ========================================================================
  // 1️⃣ IDENTIFICAÇÃO BÁSICA
  // ========================================================================
  
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  nomeCompleto!: string;

  @Column({ length: 100, nullable: true })
  apelido?: string;

  @Column({ type: 'enum', enum: Sexo, nullable: true })
  sexo?: Sexo;

  @Column({ type: 'date', nullable: true })
  dataNascimento?: Date;

  @Column({ type: 'enum', enum: EstadoCivil, nullable: true })
  estadoCivil?: EstadoCivil;

  @Column({ length: 100, nullable: true })
  nacionalidade?: string;

  @Column({ length: 50, nullable: true })
  documentoIdentidade?: string;

  // ========================================================================
  // 2️⃣ INFORMAÇÃO ESPIRITUAL / MINISTERIAL
  // ========================================================================

  @Column({ type: 'enum', enum: FuncaoMinisterial, default: FuncaoMinisterial.MEMBRO })
  funcaoMinisterial!: FuncaoMinisterial;

  @Column({ length: 200, nullable: true })
  ministerio?: string;

  @Column({ type: 'date', nullable: true })
  dataConversao?: Date;

  @Column({ type: 'date', nullable: true })
  dataBatismo?: Date;

  @Column({ length: 200, nullable: true })
  igrejaLocal?: string;

  @Column({type:'uuid', nullable: true })
  liderDireto?: string;

  @Column({ default: true })
  ativoNoMinisterio!: boolean;

  // ========================================================================
  // 3️⃣ CONTACTOS E LOCALIZAÇÃO
  // ========================================================================

  @Column({ length: 20, nullable: true })
  telefone?: string;

  @Column({ unique: true, length: 200 })
  email!: string;

  @Column({ length: 300, nullable: true })
  endereco?: string;

  @Column({ length: 100, nullable: true })
  cidade?: string;

  @Column({ length: 100, nullable: true })
  provincia?: string;

  // ========================================================================
  // 4️⃣ DADOS DE ACESSO AO SISTEMA (Autenticação)
  // ========================================================================

  @Column({ unique: true, length: 100 })
  username!: string;

  @Column({ length: 255 })
  passwordHash!: string;

  @Column({ type: 'enum', enum: UserRole, array: true, default: [UserRole.VIEWER] })
  roles!: UserRole[];

  @Column('text', { array: true, default: [] })
  permissoes!: string[];

  @Column({ default: true })
  ativo!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  ultimoLogin?: Date;

  // ========================================================================
  // 5️⃣ RESPONSABILIDADES ADMINISTRATIVAS
  // ========================================================================

  @Column('uuid')
  churchId!: string;

  @Column({ length: 200, nullable: true })
  departamento?: string;

  @Column({ type: 'int', default: 0 })
  nivelAprovacao!: number;

  @Column({ default: false })
  assinaDocumentos!: boolean;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  limiteFinanceiro?: number;

  // ========================================================================
  // 6️⃣ AUDITORIA E CONTROLO
  // ========================================================================

  @CreateDateColumn()
  criadoEm!: Date;

  @UpdateDateColumn()
  actualizadoEm!: Date;

  @Column({type:'uuid', nullable: true })
  criadoPor?: string;

  @Column({ type: 'text', nullable: true })
  observacoes?: string;
}
