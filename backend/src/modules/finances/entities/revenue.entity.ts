import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Worship } from './worship.entity';
import type { RevenueFund } from './revenue-fund.entity';

export const RevenueType = {
  OFFERING: 'OFERTA',
  TITHE: 'DIZIMO',
  TAFULA: 'TAFULA',
  SPECIAL_CONTRIBUTION: 'CONTRIBUICAO_ESPECIAL',
  MISSIONARY_OFFERING: 'OFERTA_MISSIONARIA',
  CONSTRUCTION_OFFERING: 'OFERTA_CONSTRUCAO',
  EXTERNAL_DONATION: 'DOACAO_EXTERNA',
  SPECIAL_CAMPAIGN: 'CAMPANHA_ESPECIAL',
} as const;

export type RevenueType = typeof RevenueType[keyof typeof RevenueType];

export const PaymentMethod = {
  CASH: 'NUMERARIO',
  BANK_TRANSFER: 'TRANSFERENCIA_BANCARIA',
  INTERNAL_TRANSFER: 'TRANSFERENCIA_INTERNA',
  MPESA: 'MPESA',
  EMOLA: 'EMOLA',
  MKESH: 'MKESH',
  OTHER: 'OUTRO',
} as const;

export type PaymentMethod = typeof PaymentMethod[keyof typeof PaymentMethod];

@Entity('revenues')
@Index(['churchId', 'createdAt'])
export class Revenue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  churchId!: string;

  @Column('uuid')
  recordedBy!: string;

  @Column({ type: 'varchar' })
  type!: RevenueType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount!: number;

  @Column({ type: 'varchar', default: PaymentMethod.CASH })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'uuid', nullable: true })
  worshipId?: string;

  @ManyToOne(() => Worship, { nullable: true, eager: true })
  @JoinColumn({ name: 'worshipId' })
  worship?: Worship;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  @OneToMany('RevenueFund', 'revenue', {
    cascade: true,
  })
  allocations?: RevenueFund[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
