import type { ParadaRuta } from './ruta.types';

export type RutaModo = 'completa' | 'emergencia' | 'sin_visita';

const UMBRAL_SIN_VISITA_DIAS = 7;

export function getPuntosModoCompleta(puntos: ParadaRuta[]): ParadaRuta[] {
  return puntos.filter((p) => !p.visitado);
}

export function getPuntosModoEmergencia(puntos: ParadaRuta[]): ParadaRuta[] {
  return puntos.filter((p) => p.diasVencido >= 4);
}

export function getPuntosModoSinVisita(puntos: ParadaRuta[]): ParadaRuta[] {
  return puntos.filter((p) => p.diasSinSeguimiento > UMBRAL_SIN_VISITA_DIAS);
}

export function getPuntosPorModo(modo: RutaModo, puntos: ParadaRuta[]): ParadaRuta[] {
  if (modo === 'completa') return getPuntosModoCompleta(puntos);
  if (modo === 'emergencia') return getPuntosModoEmergencia(puntos);
  return getPuntosModoSinVisita(puntos);
}
