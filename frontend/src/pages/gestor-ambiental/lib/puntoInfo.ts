// Extrae las respuestas del formulario del punto de acumulación (nivel punto)
// desde operativoData, para mostrarlas en el detalle. Usa el snapshot __fieldMeta
// (label/tipo/opciones guardado al crear) para poner labels legibles, así las
// preguntas nuevas de la encuesta aparecen sin tocar el componente.

// Claves internas o de nivel-residuo que NO son respuestas del punto.
const CLAVES_EXCLUIDAS = new Set([
  '__fieldMeta', 'residuos', 'tipo', 'barrio_detectado', 'ubicacion_mapa',
  'quienDispuso', 'tipoResiduo', 'percibeOlores', 'percibeVectores',
  'areaLinealMetros', 'fotos_evidencia', 'actoresIndisciplina', 'infoActualizadaAt',
]);

export interface PuntoAnswer {
  key: string;
  label: string;
  value: string;
}

// Claves de una versión previa del formulario quedaron como UUID sin snapshot en
// __fieldMeta; sin etiqueta legible no se muestran (el dato sigue en operativoData).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function optionLabel(meta: any, raw: any): string {
  const opts = meta?.options;
  if (Array.isArray(opts)) {
    const found = opts.find((o: any) => String(o.value) === String(raw));
    if (found) return String(found.label ?? found.value);
  }
  if (raw === true || raw === 'true') return 'Sí';
  if (raw === false || raw === 'false') return 'No';
  return String(raw);
}

function toDisplay(meta: any, raw: any): string {
  if (Array.isArray(raw)) return raw.map((r) => optionLabel(meta, r)).join(', ');
  return optionLabel(meta, raw);
}

function isEmpty(raw: any): boolean {
  return raw === undefined || raw === null || raw === '' ||
    (Array.isArray(raw) && raw.length === 0);
}

export function getPuntoSurveyAnswers(operativoData: any): PuntoAnswer[] {
  if (!operativoData || typeof operativoData !== 'object') return [];
  const meta = operativoData.__fieldMeta || {};
  const rows: PuntoAnswer[] = [];
  for (const [key, raw] of Object.entries(operativoData)) {
    if (CLAVES_EXCLUIDAS.has(key)) continue;
    if (isEmpty(raw)) continue;
    if (typeof raw === 'object' && !Array.isArray(raw)) continue; // ubicaciones u objetos complejos
    const fieldMeta = meta[key];
    const label = fieldMeta?.label;
    if (!label && UUID_RE.test(key)) continue; // clave huérfana sin etiqueta
    rows.push({ key, label: label || key, value: toDisplay(fieldMeta, raw) });
  }
  return rows;
}
