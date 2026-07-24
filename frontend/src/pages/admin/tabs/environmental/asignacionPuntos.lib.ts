import type { AsignacionRow } from '../../../../services/ambiental.service';

/** Agrupa las filas de asignación por gestorId. Las filas con gestorId null quedan fuera. */
export function groupAsignacionesByGestor(rows: AsignacionRow[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const row of rows) {
    if (!row.gestorId) continue;
    if (!out[row.gestorId]) out[row.gestorId] = [];
    out[row.gestorId].push(row.activityId);
  }
  return out;
}
