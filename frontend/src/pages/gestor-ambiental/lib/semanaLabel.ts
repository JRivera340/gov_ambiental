const BOGOTA_OFFSET_MS = 5 * 3600000;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Etiquetas de rango de fechas para el frontend.
//
// El backend ya manda `etiqueta` en cada semana del plan y del desempeño —
// usar ese campo cuando exista. Esto es para lo que solo trae fechas sueltas
// (rutas guardadas, rango del ciclo completo).
//
// Regla del proyecto: nunca mostrar "2026-W34" ni ningún formato de semana
// ISO. Al gestor y al supervisor les sirve el rango de fechas.

function enBogota(iso: string): Date {
  return new Date(new Date(iso).getTime() - BOGOTA_OFFSET_MS);
}

/** "17 al 23 de agosto" / "31 de agosto al 6 de septiembre" (con año si cruza). */
export function formatRango(inicioISO: string, finISO: string): string {
  const inicio = enBogota(inicioISO);
  const fin = enBogota(finISO);
  const dI = inicio.getUTCDate();
  const dF = fin.getUTCDate();
  const mI = MESES[inicio.getUTCMonth()];
  const mF = MESES[fin.getUTCMonth()];
  const aI = inicio.getUTCFullYear();
  const aF = fin.getUTCFullYear();

  if (aI !== aF) return `${dI} de ${mI} de ${aI} al ${dF} de ${mF} de ${aF}`;
  if (mI !== mF) return `${dI} de ${mI} al ${dF} de ${mF}`;
  return `${dI} al ${dF} de ${mI}`;
}

/** "Semana del 17 al 23 de agosto" — mismo formato que arma el backend. */
export function formatRangoSemana(inicioISO: string, finISO: string): string {
  return `Semana del ${formatRango(inicioISO, finISO)}`;
}

/** "Del 17 al 30 de agosto" — el ciclo completo de dos semanas. */
export function formatRangoCiclo(inicioISO: string, finISO: string): string {
  if (!inicioISO || !finISO) return '';
  return `Del ${formatRango(inicioISO, finISO)}`;
}
