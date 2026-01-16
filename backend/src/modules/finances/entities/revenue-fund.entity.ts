import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Revenue } from './revenue.entity';
import { Fund } from './fund.entity';

@Entity('revenue_funds')
@Index(['revenueId', 'fundId'])
export class RevenueFund {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  revenueId!: string;

  @ManyToOne('Revenue', 'allocations', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'revenueId' })
  revenue!: Revenue;

  @Column('uuid')
  fundId!: string;

  @ManyToOne(() => Fund, { eager: true })
  @JoinColumn({ name: 'fundId' })
  fund!: Fund;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
