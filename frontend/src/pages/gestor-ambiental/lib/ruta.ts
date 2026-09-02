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

// La ruta activa ya no se cachea en localStorage: se deriva de la fila de la
// semana del backend y se rehidrata contra los puntos actuales del gestor
// (ver useRutaAmbiental). `clearRutaActiva` se conserva para limpiar la clave
// que quedó de la versión anterior en los navegadores ya usados.
export function clearRutaActiva(gestorId: string): void {
  localStorage.removeItem(activeKey(gestorId));
}


// El historial de rutas tampoco vive más acá. Se guardaba en localStorage y se
// rehidrataba con los puntos visitados de la quincena EN CURSO, así que una
// quincena vieja aparecía completada por trabajo hecho después y no coincidía
// con el panel del admin. Ahora las dos pantallas leen GET /visitas/historial,
// y el arrastre de pendientes sale de GET /rutas-semanales/arrastre/mine.
