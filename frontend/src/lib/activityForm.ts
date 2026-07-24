// Lógica pura compartida por los formularios de actividad (crear/editar).

// Turno nocturno: 18:00 (6pm) a 05:59 (antes de 6am).
export function isNightShift(dateTimeString: string): boolean {
  const hour = new Date(dateTimeString).getHours();
  return hour >= 18 || hour < 6;
}

// Preguntas del survey de un subtipo (con "name" y "type") — versión mínima
// compartida entre la encuesta dinámica y la caracterización de puntos.
export interface CampoConNombre {
  name?: string;
  type: string;
  order?: number;
}

// Nombres de preguntas del survey de Puntos de Acumulación que aplican por
// residuo individual (no a nivel de punto).
export const PUNTOS_RESIDUO_SURVEY_NAMES = ['quienDispuso', 'tipoResiduo', 'percibeOlores', 'percibeVectores', 'areaLinealMetros', 'fotos_evidencia'];

// Nombres de campos genéricos del formulario (metadatos del operativo, no de
// la caracterización del punto) que no deben repetirse en la sección.
const CAMPOS_GENERICOS_OPERATIVO = ['fecha_operativo', 'ubicacion_mapa', 'barrio_detectado', 'fotos_evidencia', 'acta_pdf', 'descripcion_general', 'entidad_responsable', 'entidades_acompanantes', 'en_grupo', 'gestores_acompanantes'];

const TIPOS_NO_RENDERIZABLES = ['SECTION_HEADER', 'FILE', 'LOCATION', 'DATE'];

// Selecciona, de las preguntas del survey de un subtipo, las que corresponden
// a la caracterización a nivel de punto (excluye las de residuo individual y
// los campos genéricos del operativo), ordenadas por su "order".
export function selectPuntoNivelQuestions<T extends CampoConNombre>(questions: T[]): T[] {
  return questions
    .filter(q => !PUNTOS_RESIDUO_SURVEY_NAMES.includes(q.name ?? ''))
    .filter(q => !TIPOS_NO_RENDERIZABLES.includes(String(q.type).toUpperCase()))
    .filter(q => !CAMPOS_GENERICOS_OPERATIVO.includes(q.name || ''))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

// Pregunta con la info necesaria para armar su entrada de __fieldMeta.
export interface CampoConMeta {
  id: string;
  label: string;
  type: string;
  options?: Array<{ label: string; value: string }>;
}

// Snapshot por pregunta (etiqueta/tipo/opciones) que se guarda en
// operativoData.__fieldMeta para que la exportación y el detalle muestren el
// texto real de cada campo aunque luego se borre la pregunta en encuestas.
export type FieldMeta = Record<string, { label: string; type: string; options?: Array<{ label: string; value: string }> }>;

// Arma el __fieldMeta a partir de las preguntas vigentes de la encuesta.
export function buildFieldMeta(questions: CampoConMeta[]): FieldMeta {
  return questions.reduce((acc: FieldMeta, q) => {
    acc[q.id] = {
      label: q.label || '',
      type: q.type,
      ...(q.options ? { options: q.options } : {}),
    };
    return acc;
  }, {});
}

// Fusiona el __fieldMeta previo (snapshot guardado al crear el punto) con el
// de las preguntas vigentes de la encuesta: las preguntas actuales siempre
// ganan (por si cambió su etiqueta), y se conservan las entradas de
// preguntas que ya no están en la encuesta (para no perder historial).
export function mergeFieldMeta(prevMeta: FieldMeta | undefined | null, questions: CampoConMeta[]): FieldMeta {
  return { ...(prevMeta || {}), ...buildFieldMeta(questions) };
}
