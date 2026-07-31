export type Role =
  | 'ADMIN'
  | 'GESTOR_IVC'
  | 'GESTOR_ESPACIO_PUBLICO'
  | 'GESTOR_AMBIENTAL'
  | 'GESTOR_PYBA'
  | 'VALIDADOR_IVC'
  | 'VALIDADOR_ESPACIO_PUBLICO'
  | 'VALIDADOR_AMBIENTAL'
  | 'VALIDADOR_PYBA'
  | 'VALIDADOR_DEPORTES'
  | 'TUTOR'
  | 'ESTUDIANTE';

export type ActivityStatus =
  | 'BORRADOR'
  | 'ENVIADA'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PUBLICADA';

export type ProcessStatus = 'ACTIVO' | 'EN_SEGUIMIENTO' | 'FINALIZADO';
export type ActivityPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export type OperativoCategoria = 'IVC' | 'ESPACIO_PUBLICO' | 'AMBIENTAL' | 'PYBA';
export type OperativoSubtipo =
  | 'IVC_ESTABLECIMIENTO_COMERCIO'
  | 'IVC_PARQUEADEROS'
  | 'IVC_PAGADIARIOS'
  | 'ESPACIO_PUBLICO_1801'
  | 'AMBIENTAL'
  | 'AMBIENTAL_PUNTOS_ACUMULACION'
  | 'PYBA_HOJA_VIDA_CANINO'
  | 'PYBA_ESTERILIZACION'
  | 'PYBA_BRIGADA_VETERINARIA'
  | 'PYBA_SENSIBILIZACION'
  | 'PYBA_ADOPCION'
  | 'PYBA_URGENCIAS';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

export interface ResiduoNota {
  id: string;
  fecha: string;
  autorId: string;
  autorNombre: string;
  texto: string;
}

export interface ResiduoEntry {
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
  aprobado?: boolean;
  aprobadoAt?: string;
  notas?: ResiduoNota[];
}

export interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  createdByUserId: string;
  createdByNombre?: string;
  status: ActivityStatus;

  // Subtipo de operativo ambiental (ver ESTADO-EXTRACCION.md, hallazgo del
  // recorrido visual 2026-07-30). Default 'PUNTO_ACUMULACION' en el backend.
  tipoOperativo?: 'PUNTO_ACUMULACION' | 'GENERICO';

  // Información básica
  dateTime: string;
  activityType: string;

  // Ubicación
  lat: number;
  lng: number;
  barrio: string;

  // Evidencia
  photos: string[];

  // Resultados
  results: string;
  incautacionLicores: number;
  incautacionArmasBlancas: number;
  personasTransladadas: number;
  personasSensibilizadas: number;

  // Documentación
  actaOperativo?: string | null;
  actaPdfUrl?: string | null;

  // Entidades
  entidadResponsable: string;
  entidadesAcompanantes: string[];

  // Validación
  validatorUserId?: string | null;
  validatorName?: string | null;
  validatedAt?: string | null;
  validationNotes?: string | null;

  // Publicación
  publishedAt?: string | null;

  // Auditoría
  createdAt: string;
  updatedAt: string;

  // Campos v1.2
  operativoCategoria: OperativoCategoria;
  operativoSubtipo: OperativoSubtipo;
  isNightShift?: boolean;

  // Operativo en grupo
  isGroupOperativo?: boolean;
  gestoresInvolucrados?: Array<{
    id: string;
    name: string;
    lastname: string;
    email: string;
  }>;

  // Seguimiento (Puntos de Acumulación)
  photosFase2?: string[] | null;
  fechaFinalizacion?: string | null;

  // Proceso Ambiental
  processId?: string | null;
  priority?: ActivityPriority | null;
  descripcionAntes?: string | null;
  descripcionDespues?: string | null;
  revisadoPorUserId?: string | null;
  revisadoPorNombre?: string | null;
  fechaRevision?: string | null;
  pointNumber?: number;
  categorySeq?: number;

  // Este backend guarda `residuos` como columna propia de nivel superior
  // (no anidada en `operativoData` como en el monolito).
  residuos?: ResiduoEntry[];
  ultimoSeguimientoAt?: string | null;

  // ── Formulario fijo "Identificación de Puntos de Acumulación" ──────────
  // 26 columnas propias agregadas 2026-07-29 (ver ESTADO-EXTRACCION.md,
  // regresión de operativoData). nombreResponsable/direccionResponsable/
  // telefonoActor son DATOS PERSONALES — ver esa misma sección.
  frecuenciaAcumulacion?: string | null;
  observaciones?: string | null;
  entornoEscolar?: boolean | null;
  nombreEntornoEscolar?: string | null;
  especificarEntorno?: string | null;
  tipoZona?: string | null;
  tipoSuelo?: string | null;
  condicionesZona?: string[] | null;
  poblacionHabitanteCalle?: boolean | null;
  factoresAcumulacion?: string[] | null;
  camarasPunto?: string | null;
  operadorAseo?: string | null;
  recoleccionPuertaAPuerta?: boolean | null;
  m2Invasion?: number | null;
  actoresIndisciplina?: string | null;
  intervencionesPropuestas?: string | null;
  identificacionGenerador?: string | null;
  tipoGenerador?: string | null;
  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md. */
  nombreResponsable?: string | null;
  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md. */
  direccionResponsable?: string | null;
  observoDisposicion?: boolean | null;
  fechaObservacion?: string | null;
  metodoIdentificacion?: string | null;
  actoresEstrategicos?: string[] | null;
  /** DATO PERSONAL — ver ESTADO-EXTRACCION.md. */
  telefonoActor?: string | null;
  intervencionesRecomendadas?: string[] | null;
}

export interface Process {
  id: string;
  nombre: string;
  descripcion?: string | null;
  createdByUserId: string;
  status: ProcessStatus;
  createdAt: string;
  updatedAt: string;
  // Campos calculados del backend
  totalActividades?: number;
  actividadesPublicadas?: number;
  activities?: Activity[];
}

export interface CreateActivityDTO {
  dateTime: string;
  activityType: string;
  lat: number;
  lng: number;
  barrio: string;
  photos?: string[];
  results: string;
  incautacionLicores?: number;
  incautacionArmasBlancas?: number;
  personasTransladadas?: number;
  personasSensibilizadas?: number;
  actaOperativo?: string;
  actaPdfUrl?: string;
  entidadResponsable: string;
  entidadesAcompanantes?: string[];
  operativoCategoria: OperativoCategoria;
  operativoSubtipo: OperativoSubtipo;
  isNightShift?: boolean;
  // Operativo en grupo
  isGroupOperativo?: boolean;
  gestoresInvolucradosIds?: string[];
}

export interface DeporteSesionAdmin {
  id: string;
  grupoId: string;
  grupoNombre: string;
  grupoDeporte: string;
  grupoBarrio?: string | null;
  tutorUserId: string;
  fecha: string;
  notas?: string | null;
  asistencias: Array<{ nombre: string; presente: boolean }>;
  status: 'BORRADOR' | 'ENVIADA' | 'APROBADA' | 'RECHAZADA';
  actaPdfUrl?: string | null;
  fotosEvidencia?: string[];
  validadorUserId?: string | null;
  validadorNotes?: string | null;
  createdAt: string;
}

export type UnifiedModule = 'SORVER' | 'DEPORTES';

export interface UnifiedActivity {
  id: string;
  module: UnifiedModule;
  moduleLabel: string;
  category: string;
  fecha: string;
  status: string;
  location: string;
  typeLabel: string;
  seq?: string;
  createdByUserId: string;
  raw: Activity | DeporteSesionAdmin;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface Catalogs {
  barrios: string[];
  tiposActividad: string[];
  entidades: string[];
}
