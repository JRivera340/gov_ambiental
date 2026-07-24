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

// Tipos para datos específicos de cada subtipo de operativo
export interface IvcEstablecimientoComercioData {
  tipo: 'IVC_ESTABLECIMIENTO_COMERCIO';
  establecimientosVisitados?: number;
  sellamientos?: boolean;
  incautaciones?: number;
  licoresAdulterados?: number;
  armasCortopunzantes?: number;
  armasFuegoMunicionTraumaticas?: number;
  personasSensibilizadas?: number;
  menoresEdad?: number;
  kgAproximadoPolvora?: number;
  gramosSpa?: number;
  personasTrasladadasCtp?: number;
  personasCapturadas?: number;
  vendedoresInformalesRetirados?: number;
  vendedoresInformalesIntervenidos?: number;
}

export interface IvcParqueaderosData {
  tipo: 'IVC_PARQUEADEROS';
  sellamientos?: boolean;
  vehiculosReceptados?: number;
}

export interface IvcPagadiariosData {
  tipo: 'IVC_PAGADIARIOS';
  establecimientosVisitados?: number;
  sellamientos?: boolean;
  incautaciones?: number;
  armasCortopunzantes?: number;
  armasFuegoMunicionTraumaticas?: number;
  personasSensibilizadas?: number;
  menoresEdad?: number;
  kgAproximadoPolvora?: number;
  gramosSpa?: number;
  personasTrasladadasCtp?: number;
  personasCapturadas?: number;
  vendedoresInformalesRetirados?: number;
  vendedoresInformalesIntervenidos?: number;
}

export interface EspacioPublico1801Data {
  tipo: 'ESPACIO_PUBLICO_1801';
  estructurasNoConvencionales?: number;
  cambuches?: number;
  cachivacherosIntervenidos?: number;
  comparendos?: number;
  trasladadosCtp?: number;
  capturados?: number;
  armasCortopunzantes?: number;
  armasFuego?: number;
  personasSensibilizadas?: number;
  kgMercanciaIncautada?: number;
  pipetasIncautadas?: number;
  bicicletasRecuperadas?: number;
  celularesRecuperados?: number;
  carretasIncautadas?: number;
  mendicidad?: number;
  vendedoresInformalesRetirados?: number;
  vendedoresInformalesIntervenidos?: number;
  m2RecuperadosEspacioPublico?: number;
}

export interface AmbientalData {
  tipo: 'AMBIENTAL';
  puntosCriticosEmergentesAtendidos?: number;
  comparendosPedagogicos?: number;
  comparendos?: number;
  personasSensibilizadas?: number;
  huertas?: number;
  m3RecuperadosAproximados?: number;
  kgMaterialResiduosRecolectados?: number;
  m2RecuperadosEspacioPublico?: number;
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

export interface AmbientalPuntosAcumulacionData {
  tipo: 'AMBIENTAL_PUNTOS_ACUMULACION';
  // Legacy flat fields (backwards compat)
  quienDispuso?: string;
  tipoResiduo?: string;
  percibeOlores?: boolean;
  percibeVectores?: boolean;
  volumenEstimadoM3?: number;
  areaLinealMetros?: number;
  observaciones?: string;
  // New multi-residuo array
  residuos?: ResiduoEntry[];
}

export type OperativoData =
  | IvcEstablecimientoComercioData
  | IvcParqueaderosData
  | IvcPagadiariosData
  | EspacioPublico1801Data
  | AmbientalData
  | AmbientalPuntosAcumulacionData;

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
  operativoData?: OperativoData;

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
  operativoData?: OperativoData;
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
