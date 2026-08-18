import { limitesSemana } from './ruta-semanal.util';

// Split determinístico 50/50 alternado por semana, sin reshuffle: se ordena
// por pointNumber (secuencial, visible en la UI admin como "#N" — mas
// auditable que un hash) y se corta a la mitad. La semana par ve la primera
// mitad, la impar la segunda. Puntos nuevos extienden la mitad que les
// corresponda por su pointNumber sin mover a los demás.
export function splitAlternado<T>(itemsOrdenados: T[], paridad: 0 | 1): T[] {
  const mid = Math.ceil(itemsOrdenados.length / 2);
  const mitadA = itemsOrdenados.slice(0, mid);
  const mitadB = itemsOrdenados.slice(mid);
  return paridad === 0 ? mitadA : mitadB;
}

// Numero de semana ISO 8601 (lunes = inicio, jueves define a que año/semana
// pertenece), calculado a partir del lunes de la semana Bogotá ya resuelto
// por limitesSemana — así todo el sistema comparte la misma noción de
// "semana" (rutas semanales, plan semanal, historial de visitas).
export function isoWeekOf(fecha: Date): { year: number; week: number } {
  const { inicioISO } = limitesSemana(fecha);
  const lunes = new Date(inicioISO);
  const jueves = new Date(lunes.getTime() + 3 * 86400000);
  const year = jueves.getUTCFullYear();
  const primerJueves = new Date(Date.UTC(year, 0, 1));
  while (primerJueves.getUTCDay() !== 4) primerJueves.setUTCDate(primerJueves.getUTCDate() + 1);
  const week = 1 + Math.round((jueves.getTime() - primerJueves.getTime()) / (7 * 86400000));
  return { year, week };
}

export function isoWeekLabel(fecha: Date): string {
  const { year, week } = isoWeekOf(fecha);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function isoWeekParity(fecha: Date): 0 | 1 {
  return (isoWeekOf(fecha).week % 2) as 0 | 1;
}
