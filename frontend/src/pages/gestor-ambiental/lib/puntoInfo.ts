// Extrae las respuestas del formulario fijo de un punto de acumulación (nivel
// punto, no residuo) para mostrarlas en el detalle. Antes leía
// operativoData.__fieldMeta (formulario dinámico) — el formulario ya es fijo
// (ver ESTADO-EXTRACCION.md, regresión de operativoData corregida 2026-07-29),
// así que los labels/opciones vienen del catálogo fijo, no de un snapshot.

import { SECCIONES_PUNTO_ACUMULACION } from '../../../config/camposPuntoAcumulacion';

export interface PuntoAnswer {
  key: string;
  label: string;
  value: string;
}

function isEmpty(raw: unknown): boolean {
  return raw === undefined || raw === null || raw === '' ||
    (Array.isArray(raw) && raw.length === 0);
}

function toDisplay(options: Array<{ value: string; label: string }> | undefined, raw: unknown): string {
  const labelFor = (v: unknown): string => {
    const found = options?.find((o) => String(o.value) === String(v));
    if (found) return found.label;
    if (v === true || v === 'true') return 'Sí';
    if (v === false || v === 'false') return 'No';
    return String(v);
  };
  if (Array.isArray(raw)) return raw.map(labelFor).join(', ');
  return labelFor(raw);
}

// Campos del formulario general que se muestran en otra parte del detalle
// (fecha, ubicación, entidad) — no se repiten acá como respuesta genérica.
const CAMPOS_MOSTRADOS_APARTE = new Set(['fecha_operativo', 'ubicacion_mapa', 'entidad_responsable']);

export function getPuntoSurveyAnswers(activity: Record<string, unknown> | null | undefined): PuntoAnswer[] {
  if (!activity || typeof activity !== 'object') return [];
  const rows: PuntoAnswer[] = [];
  for (const seccion of SECCIONES_PUNTO_ACUMULACION) {
    for (const campo of seccion.campos) {
      if (CAMPOS_MOSTRADOS_APARTE.has(campo.name) || campo.type === 'LOCATION') continue;
      const raw = activity[campo.name];
      if (isEmpty(raw)) continue;
      rows.push({ key: campo.name, label: campo.label, value: toDisplay(campo.options, raw) });
    }
  }
  return rows;
}
