import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export const WorshipType = {
  REGULAR: 'CULTO_NORMAL',
  YOUTH: 'CULTO_JOVENS',
  WOMEN: 'CULTO_MULHERES',
  MEN: 'CULTO_HOMENS',
  SENIORS: 'CULTO_IDOSOS',
  WIDOWS: 'CULTO_VIUVAS',
  CONSOLATION: 'CULTO_CONSOLACAO',
  PUBLIC: 'CULTO_PUBLICO',
  VIGIL: 'VIGILIA',
  MOUNTAIN: 'CULTO_MONTE',
  CRUSADE: 'CRUZADA_EVANGELISTICA',
  CAMPAIGN: 'CAMPANHA_ESPECIAL',
} as const;

export type WorshipType = typeof WorshipType[keyof typeof WorshipType];

export const Weekday = {
  SUNDAY: 'DOMINGO',
  MONDAY: 'SEGUNDA',
  TUESDAY: 'TERCA',
  WEDNESDAY: 'QUARTA',
  THURSDAY: 'QUINTA',
  FRIDAY: 'SEXTA',
  SATURDAY: 'SABADO',
} as const;

export type Weekday = typeof Weekday[keyof typeof Weekday];

@Entity('worship_services')
@Index(['churchId', 'serviceDate'])
export class Worship {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  churchId!: string;

  @Column({ type: 'varchar' })
  type!: WorshipType;

  @Column({ type: 'varchar' })
  weekday!: Weekday;

  @Column({ type: 'date' })
  serviceDate!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location?: string;

  @Column({ type: 'text', nullable: true })
  observations?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
