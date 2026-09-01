import { limitesSemana } from './ruta-semanal.util';

// Ciclo quincenal: 14 días corridos que cubren el 100% de los puntos
// asignados a un gestor.
//
// Antes el ciclo eran dos semanas y cada punto caía en una de las dos mitades
// (mitadDePunto), así que en cualquier momento el gestor solo podía recorrer
// la mitad de sus puntos. Ahora la quincena es un bloque único: todos los
// puntos están disponibles durante los 14 días y el cumplimiento se mide una
// sola vez, contra el total de asignados.
//
// La quincena sigue anclada al lunes. Un periodo de 15 días corridos haría que
// cada ciclo empezara un día distinto de la semana (lunes, martes, miércoles…)
// y ni el gestor ni el supervisor podrían apoyarse en "arranca el lunes".

export type RangoQuincena = {
  // Índice absoluto desde el lunes ancla. Estable e irrepetible: sirve para
  // comparar o identificar una quincena sin arrastrar las dos fechas.
  indice: number;
  inicioISO: string;
  finISO: string;
  etiqueta: string;
};

// Lunes ISO arbitrario pero fijo. Contar quincenas absolutas desde un ancla
// evita el bug de derivarlas del número de semana ISO: un año con 53 semanas
// encadena dos quincenas de largo distinto en el cambio de año.
const ANCLA_LUNES_UTC = Date.UTC(2024, 0, 1);
const SEMANA_MS = 7 * 86400000;
const QUINCENA_MS = 14 * 86400000;

export const DIAS_QUINCENA = 14;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "Quincena del 17 al 30 de agosto" — nunca "2026-W34". El número de semana
// ISO no le dice nada a un gestor ni a un supervisor; el rango de fechas sí.
export function etiquetaRango(inicioISO: string, finISO: string): string {
  const inicio = new Date(new Date(inicioISO).getTime() - 5 * 3600000);
  const fin = new Date(new Date(finISO).getTime() - 5 * 3600000);

  const dInicio = inicio.getUTCDate();
  const dFin = fin.getUTCDate();
  const mInicio = MESES[inicio.getUTCMonth()];
  const mFin = MESES[fin.getUTCMonth()];
  const aInicio = inicio.getUTCFullYear();
  const aFin = fin.getUTCFullYear();

  if (aInicio !== aFin) return `Quincena del ${dInicio} de ${mInicio} de ${aInicio} al ${dFin} de ${mFin} de ${aFin}`;
  if (mInicio !== mFin) return `Quincena del ${dInicio} de ${mInicio} al ${dFin} de ${mFin}`;
  return `Quincena del ${dInicio} al ${dFin} de ${mInicio}`;
}

/** La quincena a la que pertenece una fecha. Siempre arranca un lunes. */
export function limitesQuincena(fecha: Date = new Date()): RangoQuincena {
  const { inicioISO } = limitesSemana(fecha);
  const lunesMs = new Date(inicioISO).getTime();
  const semanas = Math.floor((lunesMs - ANCLA_LUNES_UTC) / SEMANA_MS);
  // Si la semana en curso es la segunda de la quincena, el inicio es el lunes
  // anterior.
  const offsetSemanas = ((semanas % 2) + 2) % 2;
  const inicioMs = lunesMs - offsetSemanas * SEMANA_MS;
  const finMs = inicioMs + QUINCENA_MS - 1;
  const inicioQuincenaISO = new Date(inicioMs).toISOString();
  const finQuincenaISO = new Date(finMs).toISOString();
  return {
    indice: Math.floor(semanas / 2),
    inicioISO: inicioQuincenaISO,
    finISO: finQuincenaISO,
    etiqueta: etiquetaRango(inicioQuincenaISO, finQuincenaISO),
  };
}

/** Día en curso de la quincena (1..14). 0 si la fecha es anterior al inicio. */
export function diaDeQuincena(inicioISO: string, ahora: Date = new Date()): number {
  if (!inicioISO) return 0;
  const transcurrido = ahora.getTime() - new Date(inicioISO).getTime();
  if (transcurrido < 0) return 0;
  return Math.min(DIAS_QUINCENA, Math.floor(transcurrido / 86400000) + 1);
}
