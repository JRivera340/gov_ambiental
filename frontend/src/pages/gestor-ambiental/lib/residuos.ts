import { differenceInDays } from 'date-fns';
import type { Activity, ResiduoEntry } from '../../../types';

// Devuelve los residuos de una actividad. `residuos` es columna propia de
// PuntoResiduo (jsonb, ver CLAUDE.md sección 4) — no un sub-campo de
// operativoData (ese campo nunca existió en el backend de este repo, ver
// ESTADO-EXTRACCION.md: getResiduos() leía operativoData.residuos y siempre
// devolvía [] en producción real, bug corregido 2026-07-29).
export function getResiduos(activity: Activity): ResiduoEntry[] {
  const residuos = activity.residuos;
  if (!Array.isArray(residuos)) return [];
  return residuos.map((r) => ({
    ...r,
    dateTime: r.dateTime || activity.dateTime || activity.createdAt,
  }));
}

// Un punto está en emergencia si tiene residuos pendientes con 4+ días.
export function isPuntoEmergencia(activity: Activity): boolean {
  if (activity.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return false;
  const residuos = getResiduos(activity);
  return residuos.some((r) => {
    if (r.recogido) return false;
    const days = differenceInDays(new Date(), new Date(r.dateTime));
    return days >= 4;
  });
}

// Un punto está recogido si todos sus residuos lo están.
export function isPuntoRecogido(activity: Activity): boolean {
  if ((activity.status as string) === 'Recogido') return true;
  if (activity.operativoSubtipo !== 'AMBIENTAL_PUNTOS_ACUMULACION') return false;
  const residuos = getResiduos(activity);
  if (residuos.length === 0) return false;
  return residuos.every((r) => r.recogido || (r as any).status === 'Recogido');
}
