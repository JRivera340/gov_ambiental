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

// Subtipo de operativo ambiental. Ambos comparten el mismo ciclo de vida
// (estados, asignación, validación) — ver ESTADO-EXTRACCION.md, hallazgo del
// recorrido visual 2026-07-30: el subtipo genérico "Ambiental" (comparendos,
// huertas, kg recolectados, etc.) es alcanzable en el hub igual que "Puntos de
// Acumulación de Residuos" y se había descartado por error como código
// muerto. Se modela en la MISMA tabla (no una entidad aparte) a propósito:
// una tabla separada duplicaría la máquina de estados y los endpoints de
// asignación/validación, que es donde se producen los errores.
export enum TipoOperativo {
  PUNTO_ACUMULACION = 'PUNTO_ACUMULACION',
  GENERICO = 'GENERICO',
}

// Campos del formulario fijo de "Identificación de Puntos de Acumulación de
// Residuos" (antes formulario dinámico traído de gov_encuestas_publico, ver
// ESTADO-EXTRACCION.md — regresión detectada y corregida 2026-07-29). Los
// enums replican EXACTAMENTE los values de la encuesta original, no se
// renombró ni se recortó ninguna opción.

export enum FrecuenciaAcumulacion {
  PRIMERA_VEZ = 'PRIMERA_VEZ',
  OCASIONAL = 'OCASIONAL',
  FRECUENTE = 'FRECUENTE',
  PERMANENTE = 'PERMANENTE',
}

export enum TipoZona {
  RESIDENCIAL = 'RESIDENCIAL',
  COMERCIAL = 'COMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  MIXTA = 'MIXTA',
  OTRA = 'OTRA',
}

export enum TipoSuelo {
  ANDEN = 'ANDEN',
  CALLE = 'CALLE',
  SEPARADOR = 'SEPARADOR',
  PARQUE = 'PARQUE',
  OTRO = 'OTRO',
}

export enum CamarasPunto {
  NO_HAY = 'NO_HAY',
  FUNCIONAMIENTO = 'FUNCIONAMIENTO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  FUERA_DE_SERVICIO = 'FUERA_DE_SERVICIO',
}

// Cadena de evidencia para comparendos (ESTADO-EXTRACCION.md): estos 7 campos
// (identificacionGenerador -> metodoIdentificacion) se sostienen entre sí. Si
// se identifica al generador, tipoGenerador/nombreResponsable/
// direccionResponsable lo describen; observoDisposicion/fechaObservacion/
// metodoIdentificacion documentan CÓMO se llegó a esa conclusión. Quitar uno
// deja a los otros seis sin sentido — no eliminar por separado.
export enum IdentificacionGenerador {
  SI = 'SI',
  NO = 'NO',
  PARCIALMENTE = 'PARCIALMENTE',
}

export enum TipoGenerador {
  COMUNIDAD = 'COMUNIDAD',
  VIVIENDA = 'VIVIENDA',
  RESTAURANTE = 'RESTAURANTE',
  BAR = 'BAR',
  TIENDA = 'TIENDA',
  SUPERMERCADO = 'SUPERMERCADO',
  PLAZA_MERCADO = 'PLAZA_MERCADO',
  OBRA_CONSTRUCCION = 'OBRA_CONSTRUCCION',
  EMPRESA = 'EMPRESA',
  TALLER = 'TALLER',
  HABITANTE_CALLE = 'HABITANTE_CALLE',
  RECICLADOR = 'RECICLADOR',
  VOLQUETA = 'VOLQUETA',
  OTRO = 'OTRO',
}

export enum MetodoIdentificacion {
  OBSERVACION_DIRECTA = 'OBSERVACION_DIRECTA',
  INFO_COMUNIDAD = 'INFO_COMUNIDAD',
  CAMARAS = 'CAMARAS',
  FOTOGRAFIAS = 'FOTOGRAFIAS',
  DOCUMENTACION_RESIDUOS = 'DOCUMENTACION_RESIDUOS',
  INFO_OPERADOR_ASEO = 'INFO_OPERADOR_ASEO',
  OTRO = 'OTRO',
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

  // Default PUNTO_ACUMULACION: todo lo migrado del hub y todo lo creado antes
  // de este campo era de ese subtipo.
  @Column({ type: 'enum', enum: TipoOperativo, default: TipoOperativo.PUNTO_ACUMULACION })
  @Index()
  tipoOperativo!: TipoOperativo;

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

  @Column({ type: 'timestamptz', nullable: true })
  ultimoSeguimientoAt?: Date;

  // ── Formulario fijo "Identificación de Puntos de Acumulación" ──────────
  // Ver ESTADO-EXTRACCION.md: 26 columnas agregadas 2026-07-29 para corregir
  // la regresión donde estas respuestas se capturaban en pantalla y se
  // descartaban al guardar. nombreResponsable/direccionResponsable/
  // telefonoActor contienen DATOS PERSONALES de ciudadanos (ver esa misma
  // sección) — no van en el seed de desarrollo con valores reales.

  @Column({ type: 'enum', enum: FrecuenciaAcumulacion, nullable: true })
  frecuenciaAcumulacion?: FrecuenciaAcumulacion;

  @Column({ type: 'text', nullable: true })
  observaciones?: string;

  @Column({ type: 'boolean', nullable: true })
  entornoEscolar?: boolean;

  @Column({ type: 'varchar', nullable: true })
  nombreEntornoEscolar?: string;

  @Column({ type: 'varchar', nullable: true })
  especificarEntorno?: string;

  @Column({ type: 'enum', enum: TipoZona, nullable: true })
  tipoZona?: TipoZona;

  @Column({ type: 'enum', enum: TipoSuelo, nullable: true })
  tipoSuelo?: TipoSuelo;

  @Column({ type: 'text', array: true, nullable: true })
  condicionesZona?: string[];

  @Column({ type: 'boolean', nullable: true })
  poblacionHabitanteCalle?: boolean;

  @Column({ type: 'text', array: true, nullable: true })
  factoresAcumulacion?: string[];

  @Column({ type: 'enum', enum: CamarasPunto, nullable: true })
  camarasPunto?: CamarasPunto;

  @Column({ type: 'varchar', nullable: true })
  operadorAseo?: string;

  @Column({ type: 'boolean', nullable: true })
  recoleccionPuertaAPuerta?: boolean;

  @Column({ type: 'double precision', nullable: true })
  m2Invasion?: number;

  @Column({ type: 'text', nullable: true })
  actoresIndisciplina?: string;

  @Column({ type: 'text', nullable: true })
  intervencionesPropuestas?: string;

  // Cadena de evidencia para comparendos — ver comentario en el enum
  // IdentificacionGenerador más arriba. No eliminar uno de estos 7 sin
  // revisar los demás.
  @Column({ type: 'enum', enum: IdentificacionGenerador, nullable: true })
  identificacionGenerador?: IdentificacionGenerador;

  @Column({ type: 'enum', enum: TipoGenerador, nullable: true })
  tipoGenerador?: TipoGenerador;

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @Column({ type: 'varchar', nullable: true })
  nombreResponsable?: string;

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @Column({ type: 'varchar', nullable: true })
  direccionResponsable?: string;

  @Column({ type: 'boolean', nullable: true })
  observoDisposicion?: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  fechaObservacion?: Date;

  @Column({ type: 'enum', enum: MetodoIdentificacion, nullable: true })
  metodoIdentificacion?: MetodoIdentificacion;

  @Column({ type: 'text', array: true, nullable: true })
  actoresEstrategicos?: string[];

  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md, sección de datos sensibles. */
  @Column({ type: 'varchar', nullable: true })
  telefonoActor?: string;

  @Column({ type: 'text', array: true, nullable: true })
  intervencionesRecomendadas?: string[];

  // ── Formulario "Ambiental" genérico (tipoOperativo = GENERICO) ─────────
  // Comparte con el punto de acumulación: dateTime, lat/lng/barrio, photos
  // (evidencia fotográfica), results (descripción general), actaPdfUrl,
  // entidadResponsable, isGroupOperativo (operativo en grupo) y
  // gestoresInvolucradosIds (gestores acompañantes) — mismo campo, mismo
  // significado, no se duplican. Solo estos 7 contadores son exclusivos.
  @Column({ type: 'int', nullable: true })
  puntosCriticosEmergentesAtendidos?: number;

  @Column({ type: 'int', nullable: true })
  comparendosPedagogicos?: number;

  @Column({ type: 'int', nullable: true })
  comparendos?: number;

  @Column({ type: 'int', nullable: true })
  personasSensibilizadas?: number;

  @Column({ type: 'int', nullable: true })
  huertas?: number;

  @Column({ type: 'double precision', nullable: true })
  kgMaterialResiduosRecolectados?: number;

  @Column({ type: 'double precision', nullable: true })
  m2RecuperadosEspacioPublico?: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
