import type { ParadaRuta } from './ruta.types';

export type RutaModo = 'completa' | 'emergencia' | 'sin_visita' | 'automatico';

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

// Modo "automático": el backend decide qué puntos tocan esta semana (50% de
// los asignados, alternando semana a semana, más los que estén en emergencia
// sin tope — ver GET /rutas-semanales/plan). No se reimplementa el split acá,
// solo se filtra la lista local de paradas por los ids que devolvió el
// backend, para reusar el resto del flujo de planificación de ruta.
export function getPuntosModoAutomatico(puntos: ParadaRuta[], idsIncluidos: Set<string>): ParadaRuta[] {
  return puntos.filter((p) => idsIncluidos.has(p.puntoId));
}

export function getPuntosPorModo(modo: RutaModo, puntos: ParadaRuta[], idsAutomatico?: Set<string>): ParadaRuta[] {
  if (modo === 'completa') return getPuntosModoCompleta(puntos);
  if (modo === 'emergencia') return getPuntosModoEmergencia(puntos);
  if (modo === 'automatico') return getPuntosModoAutomatico(puntos, idsAutomatico ?? new Set());
  return getPuntosModoSinVisita(puntos);
}
