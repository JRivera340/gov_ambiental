import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ProcessStatus {
  ACTIVO = 'ACTIVO',
  EN_SEGUIMIENTO = 'EN_SEGUIMIENTO',
  FINALIZADO = 'FINALIZADO',
}

@Entity('procesos')
export class Proceso {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  descripcion?: string;

  @Index()
  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @Index()
  @Column({ type: 'enum', enum: ProcessStatus, default: ProcessStatus.ACTIVO })
  status!: ProcessStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
