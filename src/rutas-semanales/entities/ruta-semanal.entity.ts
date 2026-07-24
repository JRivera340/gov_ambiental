import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import type { ParadaLite } from '../lib/paradas.types';

export type EstadoRuta = 'en_progreso' | 'completada' | 'cerrada' | 'cancelada';

@Entity('ruta_semanal')
@Index(['gestorId', 'semanaInicio'], { unique: true })
export class RutaSemanal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  gestorId!: string;

  @Column({ type: 'timestamptz' })
  semanaInicio!: Date;

  @Column({ type: 'timestamptz' })
  semanaFin!: Date;

  @Column({ type: 'varchar', default: 'en_progreso' })
  estado!: EstadoRuta;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  paradas!: (ParadaLite & Record<string, unknown>)[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  segmentos!: unknown[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  arrastre!: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
