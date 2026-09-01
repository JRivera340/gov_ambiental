// Ciclo quincenal de calendario: del 1 al 15, y del 16 al fin de mes.
//
// Cada quincena cubre el 100% de los puntos asignados a un gestor.
//
// El corte es de calendario a propósito, para que el control sea por mes: cada
// mes tiene exactamente dos quincenas y ninguna cruza de un mes al siguiente.
// Antes el ciclo eran 14 días anclados a un lunes, así que un periodo podía
// arrancar el 28 de agosto y terminar el 10 de septiembre — imposible de cerrar
// contra un mes.
//
// Consecuencia importante: la quincena NO dura siempre lo mismo. La primera
// siempre tiene 15 días; la segunda tiene 13 (febrero común), 14 (febrero
// bisiesto), 15 (meses de 30) o 16 (meses de 31). Nada debe asumir un largo
// fijo: usar `diasDeQuincena`.

const BOGOTA_OFFSET_MS = 5 * 3600000; // UTC-5 fijo, Colombia no tiene horario de verano
const DIA_MS = 86400000;

export type RangoQuincena = {
  // Índice absoluto y monótono: (año*12 + mes)*2 + mitad. Identifica una
  // quincena sin arrastrar las dos fechas, y ordena cronológicamente.
  indice: number;
  inicioISO: string;
  finISO: string;
  etiqueta: string;
};

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// "Quincena del 1 al 15 de agosto" — nunca "2026-W34". El número de semana ISO
// no le dice nada a un gestor ni a un supervisor; el rango de fechas sí.
export function etiquetaRango(inicioISO: string, finISO: string): string {
  const inicio = new Date(new Date(inicioISO).getTime() - BOGOTA_OFFSET_MS);
  const fin = new Date(new Date(finISO).getTime() - BOGOTA_OFFSET_MS);
  const mes = MESES[inicio.getUTCMonth()];
  return `Quincena del ${inicio.getUTCDate()} al ${fin.getUTCDate()} de ${mes}`;
}

/** La quincena de calendario a la que pertenece una fecha. */
export function limitesQuincena(fecha: Date = new Date()): RangoQuincena {
  const bogota = new Date(fecha.getTime() - BOGOTA_OFFSET_MS);
  const ano = bogota.getUTCFullYear();
  const mes = bogota.getUTCMonth();
  const primeraMitad = bogota.getUTCDate() <= 15;

  const inicioBogota = Date.UTC(ano, mes, primeraMitad ? 1 : 16);
  // Fin exclusivo: el 16 del mismo mes, o el 1 del mes siguiente. Dejar que
  // Date.UTC normalice el mes 12 evita tener que saber cuántos días tiene cada
  // mes, febrero bisiesto incluido.
  const finExclusivoBogota = primeraMitad ? Date.UTC(ano, mes, 16) : Date.UTC(ano, mes + 1, 1);

  const inicioISO = new Date(inicioBogota + BOGOTA_OFFSET_MS).toISOString();
  const finISO = new Date(finExclusivoBogota + BOGOTA_OFFSET_MS - 1).toISOString();

  return {
    indice: (ano * 12 + mes) * 2 + (primeraMitad ? 0 : 1),
    inicioISO,
    finISO,
    etiqueta: etiquetaRango(inicioISO, finISO),
  };
}

/** Cuántos días tiene la quincena (13..16 según el mes). */
export function diasDeQuincena(inicioISO: string, finISO: string): number {
  if (!inicioISO || !finISO) return 0;
  const ms = new Date(finISO).getTime() - new Date(inicioISO).getTime() + 1;
  return Math.round(ms / DIA_MS);
}

/** Día en curso de la quincena (1..N). 0 si la fecha es anterior al inicio. */
export function diaDeQuincena(inicioISO: string, finISO: string, ahora: Date = new Date()): number {
  if (!inicioISO || !finISO) return 0;
  const transcurrido = ahora.getTime() - new Date(inicioISO).getTime();
  if (transcurrido < 0) return 0;
  return Math.min(diasDeQuincena(inicioISO, finISO), Math.floor(transcurrido / DIA_MS) + 1);
}
