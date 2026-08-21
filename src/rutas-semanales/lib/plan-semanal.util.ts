import { limitesSemana } from './ruta-semanal.util';

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
