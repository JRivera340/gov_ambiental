import { differenceInDays } from 'date-fns';
import type { Activity, ResiduoEntry } from '../../../types';

// Devuelve los residuos de una actividad. `residuos` es columna propia de
// PuntoResiduo (jsonb) en este backend — no un sub-campo de operativoData
// (ese campo es del hub, nunca existió acá). Bug real: leer operativoData
// siempre devolvía [], vaciando esta función para TODO el módulo gestor
// (perfil, mapa, ruta, sidebar, detalle — todo lo que depende de residuos).
export function getResiduos(activity: Activity): ResiduoEntry[] {
  const residuos = (activity as any).residuos;
  if (!Array.isArray(residuos)) return [];
  return residuos.map((r: ResiduoEntry) => ({
    ...r,
    dateTime: r.dateTime || activity.dateTime || activity.createdAt,
  }));
}

// Un punto está en emergencia si tiene residuos pendientes con 4+ días.
// Mono-subtipo: todo lo que llega a este backend ya es punto de acumulación
// — operativoSubtipo es un campo del hub que no existe acá.
export function isPuntoEmergencia(activity: Activity): boolean {
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
  const residuos = getResiduos(activity);
  if (residuos.length === 0) return false;
  return residuos.every((r) => r.recogido || (r as any).status === 'Recogido');
}
