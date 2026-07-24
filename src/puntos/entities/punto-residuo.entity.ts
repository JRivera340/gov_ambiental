import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EstadoPunto {
  BORRADOR = 'BORRADOR',
  ENVIADA = 'ENVIADA',
  APROBADA = 'APROBADA',
  RECHAZADA = 'RECHAZADA',
  PUBLICADA = 'PUBLICADA',
}

export type ResiduoNota = {
  id: string;
  fecha: string;
  autorId: string;
  autorNombre: string;
  texto: string;
};

export type ResiduoEntry = {
  id: string;
  tipoResiduo: string;
  quienDispuso: string;
  dateTime: string;
  percibeOlores: boolean;
  percibeVectores: boolean;
  volumenEstimadoM3?: number;
  areaLinealMetros: number;
  observaciones?: string;
  photos: string[];
  recogido: boolean;
  fechaRecogida?: string;
  photosRecogida?: string[];
  createdByUserId?: string;
  createdByNombre?: string;
  recogidoByUserId?: string;
  recogidoByNombre?: string;
  notas?: ResiduoNota[];
};

@Entity('puntos_residuo')
export class PuntoResiduo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  createdByUserId!: string;

  @Column({ type: 'enum', enum: EstadoPunto, default: EstadoPunto.BORRADOR })
  status!: EstadoPunto;

  @Column({ type: 'timestamptz' })
  @Index()
  dateTime!: Date;

  @Column({ type: 'double precision' })
  lat!: number;

  @Column({ type: 'double precision' })
  lng!: number;

  @Column({ type: 'varchar' })
  @Index()
  barrio!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  photos!: string[];

  @Column({ type: 'text', array: true, nullable: true })
  photosFase2?: string[];

  @Column({ type: 'timestamptz', nullable: true })
  fechaFinalizacion?: Date;

  @Column({ type: 'text', nullable: true })
  actaPdfUrl?: string;

  @Column({ type: 'uuid', nullable: true })
  validatorUserId?: string;

  @Column({ type: 'timestamptz', nullable: true })
  validatedAt?: Date;

  @Column({ type: 'text', nullable: true })
  validationNotes?: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  processId?: string;

  @Column({ type: 'text', nullable: true })
  descripcionAntes?: string;

  @Column({ type: 'text', nullable: true })
  descripcionDespues?: string;

  @Column({ type: 'uuid', nullable: true })
  revisadoPorUserId?: string;

  @Column({ type: 'varchar', nullable: true })
  revisadoPorNombre?: string;

  @Column({ type: 'timestamptz', nullable: true })
  fechaRevision?: Date;

  @Column({ type: 'int', nullable: true })
  @Index()
  pointNumber?: number;

  @Column({ type: 'int', nullable: true })
  categorySeq?: number;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  residuos!: ResiduoEntry[];

  @Column({ type: 'timestamptz', nullable: true })
  ultimoSeguimientoAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
