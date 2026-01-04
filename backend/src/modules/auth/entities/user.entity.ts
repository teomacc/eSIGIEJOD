import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * ENUM - Papéis/Roles de Usuários
 * 
 * Define a hierarquia de autoridade no sistema:
 * - PASTOR: Aprovação suprema, acesso total
 * - DIRECTOR: Director financeiro, aprova até 50.000 MT
 * - TREASURER: Tesoureiro local, aprova até 5.000 MT
 * - AUDITOR: Auditor, acesso de leitura a tudo
 * - VIEWER: Apenas visualização limitada
 * 
 * Hierarquia de aprovação (da menor para maior autoridade):
 * TREASURER < DIRECTOR < BOARD < PASTOR
 */
export const UserRole = {
  PASTOR: 'PASTOR',
  DIRECTOR: 'DIRECTOR',
  TREASURER: 'TREASURER',
  AUDITOR: 'AUDITOR',
  VIEWER: 'VIEWER',
};

export type UserRole = typeof UserRole[keyof typeof UserRole];

/**
 * ENTIDADE - Usuário
 * 
 * Responsabilidade: Armazenar informações de autenticação e autorização
 * 
 * Fluxo de utilização:
 * 1. Usuário registado com email, password e churchId
 * 2. Atribuir roles baseado na função na igreja
 * 3. Ao fazer login, token JWT é gerado com roles e churchId
 * 4. Token é usado para autorizar requisições posteriores
 * 5. Audit logs registam quem fez cada ação
 * 
 * Campos importantes:
 * - churchId: Isolamento de dados por igreja
 * - roles: Array de papéis (um usuário pode ter múltiplos)
 * - isActive: Desativar sem deletar (soft delete)
 */
@Entity('users')
export class User {
  // Identificador único (UUID gerado automaticamente)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nome do usuário
  @Column()
  name!: string;

  // Email único (login)
  @Column({ unique: true })
  email!: string;

  // Password (deve ser hasheada com bcrypt)
  // TODO: Implementar hashing com bcrypt em AuthService
  @Column()
  password!: string;

  // ID da igreja (isolamento de dados)
  // Cada usuário pertence a exatamente uma igreja
  // Todas as queries filtram por este campo
  @Column('uuid')
  churchId!: string;

  // Papéis/Roles do usuário (array)
  // Exemplo: ['TREASURER', 'AUDITOR'] = tesoureiro e auditor
  // Utilizados para autorizar ações (veja approval.service.ts)
  @Column('text', { array: true })
  roles!: UserRole[];

  // Flag para soft delete (desativar sem deletar do BD)
  @Column({ default: true })
  isActive!: boolean;

  // Timestamp: Quando foi criado
  @CreateDateColumn()
  createdAt!: Date;

  // Timestamp: Última actualização
  @UpdateDateColumn()
  updatedAt!: Date;
}
