import { operativoSubtiposCatalog } from '../types/operativoSubtiposCatalog';

// Mapa subtipo (enum) → etiqueta legible, derivado del catálogo de subtipos.
const SUBTIPO_LABELS: Record<string, string> = Object.fromEntries(
  operativoSubtiposCatalog.map((s) => [s.value, s.label]),
);

// Etiqueta legible del tipo de actividad para mostrar en tablas/cards.
// Prefiere el label del subtipo (confiable) sobre `activityType`, que en datos
// antiguos puede venir duplicado o con enums técnicos.
export function getActivityTipoLabel(activity: {
  operativoSubtipo?: string | null;
  activityType?: string | null;
}): string {
  const sub = activity.operativoSubtipo;
  if (sub && SUBTIPO_LABELS[sub]) return SUBTIPO_LABELS[sub];
  return activity.activityType || '';
}
