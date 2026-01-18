import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('churches')
@Index(['codigo'], { unique: true })
export class Church {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  nome!: string;

  @Column({ length: 50 })
  codigo!: string;

  @Column({ default: true })
  activa!: boolean;

  @Column('uuid', { nullable: true })
  pastorLocalId?: string;

  @Column('uuid', { nullable: true })
  liderFinanceiroLocalId?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
