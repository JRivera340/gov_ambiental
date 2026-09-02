import type { QuincenaHistorialDTO } from '../../../services/ambiental.service';
import type { RutaActiva, ParadaRuta } from './ruta.types';

// Convierte una quincena cerrada del servidor a la forma que ya consumen las
// vistas del historial del gestor.
//
// Antes el historial del gestor vivía en localStorage y se rehidrataba con los
// puntos visitados de la quincena EN CURSO: una ruta de agosto aparecía
// completada si el gestor había visitado esos puntos en septiembre. El admin,
// que cuenta las visitas dentro del rango real de cada quincena, mostraba otro
// número — y los dos paneles se contradecían.
//
// Ahora las dos pantallas leen el mismo endpoint (GET /visitas/historial), así
// que no pueden discrepar.

export function rutaDesdeQuincena(q: QuincenaHistorialDTO): RutaActiva {
  const paradas: ParadaRuta[] = q.paradas.map((p, idx) => ({
    numeroGlobal: idx + 1,
    numeroSegmento: idx + 1,
    puntoId: p.puntoId,
    lat: p.lat,
    lng: p.lng,
    barrio: p.barrio,
    diasVencido: 0,
    tiposResiduo: [],
    visitado: p.visitado,
    diasSinSeguimiento: Infinity,
  }));

  // Una quincena puede venir de varias rutas (las semanales viejas). Se muestra
  // como un solo bloque: el corte por semana ya no significa nada.
  const todasCanceladas = q.rutas.length > 0 && q.rutas.every((r) => r.estado === 'cancelada');
  const cerradaISO = q.rutas.reduce(
    (ultima, r) => (new Date(r.cerradaISO).getTime() > new Date(ultima).getTime() ? r.cerradaISO : ultima),
    q.rutas[0]?.cerradaISO ?? q.finISO,
  );

  return {
    id: `quincena-${q.indice}`,
    gestorId: '',
    gestorNombre: '',
    fechaCreacion: q.inicioISO,
    fechaCierre: cerradaISO,
    estado: todasCanceladas ? 'cancelada' : 'finalizada',
    totalPuntos: paradas.length,
    puntosVencidos: 0,
    segmentos: paradas.length > 0
      ? [{
          id: 'A',
          label: q.etiqueta,
          estado: q.pendientes === 0 ? 'completado' : 'pendiente',
          paradas,
        }]
      : [],
  };
}

export function rutasDesdeHistorial(quincenas: QuincenaHistorialDTO[]): RutaActiva[] {
  return quincenas.map(rutaDesdeQuincena);
}
