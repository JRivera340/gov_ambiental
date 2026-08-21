import { limitesSemana } from './ruta-semanal.util';
import { isoWeekLabel } from './plan-semanal.util';

// Ciclo de 2 semanas que cubre el 100% de los puntos asignados a un gestor.
//
// Antes el plan semanal mostraba solo la mitad de los asignados (splitAlternado)
// y la otra mitad aparecía la semana siguiente. El problema no era el reparto
// sino el conteo: la ruta del gestor listaba TODOS sus puntos, así que las
// visitas a la mitad que no tocaba esa semana no sumaban en ningún lado y el
// gestor aparecía con 0%. Ahora las dos semanas del ciclo se calculan y se
// muestran juntas, cada una con su progreso, y ninguna visita se pierde.

export type SlotSemana = 0 | 1;

export type RangoSemana = {
  slot: SlotSemana;
  semanaISO: string;
  inicioISO: string;
  finISO: string;
  etiqueta: string;
  // Desde cuándo cuentan las visitas de esta semana. Arranca en el lunes de la
  // PRIMERA semana del ciclo, no en el lunes propio: así, si el gestor adelanta
  // trabajo y visita un punto de la semana que viene, ese avance sigue contando
  // cuando esa semana pase a ser la actual, en vez de perderse.
  ventanaDesdeISO: string;
};

// Lunes ISO arbitrario pero fijo. Contar semanas absolutas desde un ancla evita
// el bug de usar la paridad del número de semana ISO: un año con 53 semanas
// encadena W53 impar → W1 impar, o sea dos semanas seguidas con la misma mitad
// y una mitad que se saltea un ciclo entero.
const ANCLA_LUNES_UTC = Date.UTC(2024, 0, 1);
const SEMANA_MS = 7 * 86400000;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

// Hash estable para los puntos sin pointNumber (los migrados viejos). No
// necesita ser criptográfico, solo determinístico: el mismo punto tiene que
// caer siempre en la misma mitad.
function hash32(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A qué mitad del ciclo pertenece un punto. Se decide por punto y sin mirar la
// lista completa: dar de alta o de baja un punto no mueve a ningún otro. El
// splitAlternado anterior ordenaba y cortaba al medio, así que insertar un
// punto con número bajo corría el corte y cambiaba de mitad a casi todos.
export function mitadDePunto(p: { id: string; pointNumber?: number | null }): SlotSemana {
  if (p.pointNumber != null && Number.isFinite(p.pointNumber)) {
    return (Math.abs(Math.trunc(p.pointNumber)) % 2) as SlotSemana;
  }
  return (hash32(p.id) % 2) as SlotSemana;
}

export function indiceCiclo(fecha: Date): SlotSemana {
  const { inicioISO } = limitesSemana(fecha);
  const semanas = Math.floor((new Date(inicioISO).getTime() - ANCLA_LUNES_UTC) / SEMANA_MS);
  return (((semanas % 2) + 2) % 2) as SlotSemana;
}

// "Semana del 17 al 23 de agosto" — nunca "2026-W34". El número de semana ISO
// no le dice nada a un gestor ni a un supervisor; el rango de fechas sí.
export function etiquetaRango(inicioISO: string, finISO: string): string {
  const inicio = new Date(new Date(inicioISO).getTime() - 5 * 3600000);
  const fin = new Date(new Date(finISO).getTime() - 5 * 3600000);

  const dInicio = inicio.getUTCDate();
  const dFin = fin.getUTCDate();
  const mInicio = MESES[inicio.getUTCMonth()];
  const mFin = MESES[fin.getUTCMonth()];
  const aInicio = inicio.getUTCFullYear();
  const aFin = fin.getUTCFullYear();

  if (aInicio !== aFin) return `Semana del ${dInicio} de ${mInicio} de ${aInicio} al ${dFin} de ${mFin} de ${aFin}`;
  if (mInicio !== mFin) return `Semana del ${dInicio} de ${mInicio} al ${dFin} de ${mFin}`;
  return `Semana del ${dInicio} al ${dFin} de ${mInicio}`;
}

function rangoDeLunes(inicioISO: string, ventanaDesdeISO: string): RangoSemana {
  const inicio = new Date(inicioISO);
  const finISO = new Date(inicio.getTime() + SEMANA_MS - 1).toISOString();
  return {
    slot: indiceCiclo(inicio),
    semanaISO: isoWeekLabel(inicio),
    inicioISO,
    finISO,
    etiqueta: etiquetaRango(inicioISO, finISO),
    ventanaDesdeISO,
  };
}

// Las dos semanas del ciclo: [la que está en curso, la siguiente]. Entre las
// dos se cubren todos los puntos asignados del gestor.
export function semanasDelCiclo(ahora: Date = new Date()): [RangoSemana, RangoSemana] {
  const { inicioISO } = limitesSemana(ahora);
  const siguienteISO = new Date(new Date(inicioISO).getTime() + SEMANA_MS).toISOString();
  // Las dos ventanas arrancan el lunes de la semana en curso: lo que se
  // adelante de la semana siguiente ya queda contabilizado para ella.
  return [rangoDeLunes(inicioISO, inicioISO), rangoDeLunes(siguienteISO, inicioISO)];
}
