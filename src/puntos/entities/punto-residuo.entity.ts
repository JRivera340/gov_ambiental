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

  @Column({ type: 'text', nullable: true })
  results?: string;

  @Column({ type: 'text', nullable: true })
  entidadResponsable?: string;

  @Column({ type: 'text', array: true, nullable: true })
  entidadesAcompanantes?: string[];

  @Column({ type: 'boolean', default: false })
  isGroupOperativo!: boolean;

  @Column({ type: 'uuid', array: true, nullable: true })
  gestoresInvolucradosIds?: string[];

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

  // Respuestas de la encuesta dinámica "Puntos de Acumulación de Residuos"
  // (frecuenciaAcumulacion, tipoZona, tipoSuelo, camarasPunto,
  // identificacionGenerador, tipoGenerador, metodoIdentificacion, etc — ~26
  // preguntas a nivel de punto, keyed por el `name` estable de la pregunta,
  // no por el id/UUID que cambia si se edita la encuesta en gov_encuestas).
  // El formulario de creación las capturaba pero nunca se guardaban en
  // ningún lado — se llenaban y se perdían. JSONB porque el set de
  // preguntas lo define una encuesta externa, no un esquema fijo acá.
  @Column({ type: 'jsonb', nullable: true })
  datosFormulario?: Record<string, unknown>;

  @Column({ type: 'timestamptz', nullable: true })
  ultimoSeguimientoAt?: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
