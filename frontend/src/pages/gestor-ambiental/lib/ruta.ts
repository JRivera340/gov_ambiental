import type { RutaActiva, SegmentoRuta, ParadaRuta } from './ruta.types';

const SEGMENT_IDS: ('A' | 'B')[] = ['A', 'B'];

export function segmentoEstado(paradas: ParadaRuta[]): SegmentoRuta['estado'] {
  if (paradas.length === 0) return 'pendiente';
  const allVisited = paradas.every((p) => p.visitado);
  if (allVisited) return 'completado';
  const anyVisited = paradas.some((p) => p.visitado);
  return anyVisited ? 'en_progreso' : 'pendiente';
}

// La ruta de la semana se recorre en dos tramos, no en bloques fijos de 25:
// el gestor divide su semana en dos salidas y cada tramo tiene que ser la
// mitad de SU ruta, no un corte arbitrario que dejaba un tercer segmento con
// cuatro paradas sueltas.
export function buildSegmentos(rutaOrdenada: ParadaRuta[]): SegmentoRuta[] {
  if (rutaOrdenada.length === 0) return [];
  const corte = Math.ceil(rutaOrdenada.length / 2);
  const trozos = rutaOrdenada.length <= 1
    ? [rutaOrdenada]
    : [rutaOrdenada.slice(0, corte), rutaOrdenada.slice(corte)];

  const segmentos: SegmentoRuta[] = [];
  let desde = 0;
  trozos.forEach((chunk, idx) => {
    if (chunk.length === 0) return;
    const from = desde + 1;
    const to = desde + chunk.length;
    desde = to;
    segmentos.push({
      id: SEGMENT_IDS[idx],
      label: `Segmento ${SEGMENT_IDS[idx]} — puntos ${from} al ${to}`,
      estado: segmentoEstado(chunk),
      paradas: chunk.map((p, j) => ({ ...p, numeroSegmento: j + 1 })),
    });
  });
  return segmentos;
}

function activeKey(gestorId: string) {
  return `ambiental_ruta_activa_${gestorId}`;
}

function historialKey(gestorId: string) {
  return `ambiental_historial_rutas_${gestorId}`;
}

// La ruta activa ya no se cachea en localStorage: se deriva de la fila de la
// semana del backend y se rehidrata contra los puntos actuales del gestor
// (ver useRutaAmbiental). `clearRutaActiva` se conserva para limpiar la clave
// que quedó de la versión anterior en los navegadores ya usados.
export function clearRutaActiva(gestorId: string): void {
  localStorage.removeItem(activeKey(gestorId));
}

export function getHistorialRutas(gestorId: string): RutaActiva[] {
  try {
    const raw = localStorage.getItem(historialKey(gestorId));
    return raw ? (JSON.parse(raw) as RutaActiva[]) : [];
  } catch {
    return [];
  }
}

// Id propio de la entrada de historial — distinto del id de `RutaSemanal`
// (que es uno por gestor+semana). Reusar ese id causaba que, al finalizar o
// cancelar varias veces la misma semana, todas las entradas de historial
// colisionaran en el mismo id y `deleteFromHistorial` borrara varias a la vez.
function generarIdHistorial(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `hist_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function addToHistorial(ruta: RutaActiva, fechaCierre = new Date().toISOString()): void {
  const historial = getHistorialRutas(ruta.gestorId);
  historial.unshift({ ...ruta, id: generarIdHistorial(), estado: 'finalizada', fechaCierre });
  localStorage.setItem(historialKey(ruta.gestorId), JSON.stringify(historial));
}

export function cancelarRutaAndAddToHistorial(ruta: RutaActiva, fechaCierre = new Date().toISOString()): void {
  const historial = getHistorialRutas(ruta.gestorId);
  historial.unshift({ ...ruta, id: generarIdHistorial(), estado: 'cancelada', fechaCierre });
  localStorage.setItem(historialKey(ruta.gestorId), JSON.stringify(historial));
}

export function getUnvisitedActivityIds(gestorId: string): Set<string> {
  const historial = getHistorialRutas(gestorId);
  const ids = new Set<string>();
  for (const ruta of historial) {
    for (const seg of ruta.segmentos) {
      for (const p of seg.paradas) {
        if (!p.visitado) ids.add(p.puntoId);
      }
    }
  }
  return ids;
}

export function deleteFromHistorial(gestorId: string, rutaId: string): void {
  const historial = getHistorialRutas(gestorId).filter(r => r.id !== rutaId);
  localStorage.setItem(historialKey(gestorId), JSON.stringify(historial));
}
