// Catálogos de la bitácora de actores. Mismo estilo que residuoTipos.ts:
// value/label planos, sin lógica, para usar en selects y para resolver
// labels en las vistas.

export const TIPO_ACTOR_OPTIONS = [
  { value: 'PERSONA', label: 'Persona' },
  { value: 'ESTABLECIMIENTO', label: 'Establecimiento' },
  { value: 'EMPRESA', label: 'Empresa' },
  { value: 'VEHICULO', label: 'Vehículo' },
  { value: 'OTRO', label: 'Otro' },
];

export const ACTIVIDAD_OBSERVADA_OPTIONS = [
  { value: 'DISPOSICION', label: 'Disposición de residuos' },
  { value: 'ABANDONO', label: 'Abandono de residuos' },
  { value: 'TRANSPORTE', label: 'Transporte de residuos' },
  { value: 'DESCARGUE', label: 'Descargue de residuos' },
  { value: 'OTRO', label: 'Otro' },
];

export const CANTIDAD_APROXIMADA_OPTIONS = [
  { value: 'MENOS_DE_UNA_BOLSA', label: 'Menos de una bolsa' },
  { value: 'UNA_A_CINCO_BOLSAS', label: '1 a 5 bolsas' },
  { value: 'MEDIA_CARGA_VEHICULO', label: 'Media carga de vehículo' },
  { value: 'CARGA_COMPLETA_VEHICULO', label: 'Carga completa de vehículo' },
  { value: 'MAS_DE_UNA_CARGA', label: 'Más de una carga' },
];

export const EVIDENCIA_TIPO_OPTIONS = [
  { value: 'FOTOGRAFIAS', label: 'Fotografías' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'DOCUMENTO', label: 'Documento/Acta' },
  { value: 'OBSERVACION_DIRECTA', label: 'Observación directa' },
];

export const ESTADO_ACTOR_OPTIONS: Array<{ value: string; label: string; color: string }> = [
  { value: 'IDENTIFICADO', label: 'Identificado', color: '#eab308' },
  { value: 'EN_SEGUIMIENTO', label: 'En seguimiento', color: '#3b82f6' },
  { value: 'REINCIDENTE', label: 'Reincidente', color: '#f97316' },
  { value: 'INTERVENIDO', label: 'Intervenido', color: '#16a34a' },
  { value: 'CASO_CERRADO', label: 'Caso cerrado', color: '#111827' },
];

function labelDe(opciones: Array<{ value: string; label: string }>, value: string): string {
  return opciones.find((o) => o.value === value)?.label ?? value;
}

export const getActividadObservadaLabel = (value: string) => labelDe(ACTIVIDAD_OBSERVADA_OPTIONS, value);
export const getCantidadAproximadaLabel = (value: string) => labelDe(CANTIDAD_APROXIMADA_OPTIONS, value);
export const getTipoActorLabel = (value: string) => labelDe(TIPO_ACTOR_OPTIONS, value);
export const getEvidenciaTipoLabel = (value: string) => labelDe(EVIDENCIA_TIPO_OPTIONS, value);

export function getEstadoActor(value: string) {
  return ESTADO_ACTOR_OPTIONS.find((o) => o.value === value) ?? { value, label: value, color: '#6b7280' };
}

// Total de eventos entre todos los actores del punto — usado para el badge
// del botón "Bitácora de actores" (refleja mejor el volumen de actividad
// que contar solo actores).
export function contarEventosBitacora(actores?: Array<{ eventos: unknown[] }>): number {
  return (actores || []).reduce((total, actor) => total + actor.eventos.length, 0);
}
