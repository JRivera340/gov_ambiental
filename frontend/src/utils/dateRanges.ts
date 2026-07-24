import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// Helpers de rangos de fecha compartidos por los dashboards. Fuente única: antes
// estaban copiados inline (gSOM/gEOM) en HomePage, GestorDashboard, Validador, etc.
// Todo en formato 'yyyy-MM-dd' (el que esperan los filtros del backend).

const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

export const startOfMonthStr = () => fmt(startOfMonth(new Date()));
export const endOfMonthStr = () => fmt(endOfMonth(new Date()));
export const startOfYearStr = () => fmt(startOfYear(new Date()));
export const endOfYearStr = () => fmt(endOfYear(new Date()));
export const todayStr = () => fmt(new Date());

export const lastWeekStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return fmt(d);
};

// 'yyyy-MM' → rango { desde, hasta } que cubre todo el mes. Vacío/inválido → null
// (el llamador conserva el rango vigente).
export function monthToRange(val: string): { desde: string; hasta: string } | null {
  if (!val) return null;
  const [year, month] = val.split('-').map(Number);
  if (!year || !month) return null;
  const date = new Date(year, month - 1, 1);
  return { desde: fmt(startOfMonth(date)), hasta: fmt(endOfMonth(date)) };
}

// Índice de mes (0-11) del año actual → rango del mes.
export function monthIndexToRange(monthIndex: number): { desde: string; hasta: string } {
  const d = new Date();
  d.setMonth(monthIndex);
  return { desde: fmt(startOfMonth(d)), hasta: fmt(endOfMonth(d)) };
}
