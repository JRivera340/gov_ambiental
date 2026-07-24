import type { Activity } from '../../../types';
import { getResiduos, isPuntoEmergencia } from './residuos';
import type { EventoGeo } from '../../../lib/reincidencia.lib';

const DAY = 86400000;

export function tiempoMedioRecoleccionDias(puntos: Activity[]): number {
  let suma = 0, n = 0;
  for (const p of puntos) {
    for (const res of getResiduos(p)) {
      if (res.recogido && res.fechaRecogida && res.dateTime) {
        const d = (new Date(res.fechaRecogida).getTime() - new Date(res.dateTime).getTime()) / DAY;
        if (isFinite(d) && d >= 0) { suma += d; n++; }
      }
    }
  }
  return n === 0 ? 0 : suma / n;
}

export function coberturaPct(puntos: Activity[]): number {
  let conResiduos = 0, atendidos = 0;
  for (const p of puntos) {
    const res = getResiduos(p);
    if (res.length === 0) continue;
    conResiduos++;
    if (res.every(x => x.recogido)) atendidos++;
  }
  return conResiduos === 0 ? 0 : Math.round((atendidos / conResiduos) * 100);
}

export function puntosVencidos(puntos: Activity[]): Activity[] {
  return puntos.filter(p => isPuntoEmergencia(p));
}

export function residuosPorTipo(puntos: Activity[]): { tipo: string; total: number; recogidos: number }[] {
  const acc: Record<string, { total: number; recogidos: number }> = {};
  for (const p of puntos) {
    for (const res of getResiduos(p)) {
      const t = res.tipoResiduo || 'SIN_TIPO';
      acc[t] ??= { total: 0, recogidos: 0 };
      acc[t].total++;
      if (res.recogido) acc[t].recogidos++;
    }
  }
  return Object.entries(acc).map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total);
}

export function puntosReincidentes(
  puntos: Activity[],
  minCiclos = 2,
): { puntoResiduoId: string; barrio: string; ciclos: number }[] {
  const out: { puntoResiduoId: string; barrio: string; ciclos: number }[] = [];
  for (const p of puntos) {
    const res = getResiduos(p);
    const recogidos = res.filter(x => x.recogido).length;
    const pendientes = res.some(x => !x.recogido) ? 1 : 0;
    const ciclos = recogidos + pendientes;
    if (ciclos >= minCiclos) out.push({ puntoResiduoId: p.id, barrio: p.barrio, ciclos });
  }
  return out.sort((a, b) => b.ciclos - a.ciclos);
}

export function eventosDesdePuntos(puntos: Activity[]): EventoGeo[] {
  return puntos.map(p => ({
    id: p.id, lat: p.lat, lng: p.lng, barrio: p.barrio,
    fechaMs: new Date(p.dateTime).getTime(),
  }));
}
