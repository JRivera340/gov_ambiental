import type { QuincenaHistorialDTO } from '../../../../services/ambiental.service';

// Ayudas del historial de rutas del admin.
//
// El agregado por quincena lo arma el backend (GET /rutas-semanales/historial):
// agrupa las rutas por la quincena a la que pertenecen y fusiona sus paradas.
// Eso importa para los datos viejos — antes del ciclo quincenal se creaba una
// ruta por semana, y mostradas de a una las cards decían "Quincena del 17 al
// 23", que son 7 días. Acá solo quedan los cálculos de presentación.

/** Estado a mostrar para la quincena, derivado de las rutas que la componen. */
export function estadoQuincena(q: QuincenaHistorialDTO): 'cerrada' | 'cancelada' | 'parcial' | 'sin_ruta' {
  if (q.rutas.length === 0) return 'sin_ruta';
  if (q.rutas.every((r) => r.estado === 'cancelada')) return 'cancelada';
  // Alguna cancelada y alguna no: la quincena se trabajó a medias.
  if (q.rutas.some((r) => r.estado === 'cancelada')) return 'parcial';
  return 'cerrada';
}

/** Fecha real de cierre de la quincena: la más tardía de sus rutas. */
export function cierreQuincena(q: QuincenaHistorialDTO): string {
  if (q.rutas.length === 0) return q.finISO;
  return q.rutas.reduce(
    (ultima, r) => (new Date(r.cerradaISO).getTime() > new Date(ultima).getTime() ? r.cerradaISO : ultima),
    q.rutas[0].cerradaISO,
  );
}

/** Acumulado de todo el historial, para la cabecera del panel. */
export function totalesHistorial(quincenas: QuincenaHistorialDTO[]): {
  quincenas: number;
  planificados: number;
  visitados: number;
  pct: number;
  canceladas: number;
} {
  const planificados = quincenas.reduce((t, q) => t + q.planificados, 0);
  const visitados = quincenas.reduce((t, q) => t + q.visitados, 0);
  return {
    quincenas: quincenas.length,
    planificados,
    visitados,
    // Se acumula sobre los totales, no se promedian porcentajes: una quincena
    // de 2 puntos no puede pesar lo mismo que una de 40.
    pct: planificados > 0 ? Math.round((visitados / planificados) * 100) : 0,
    canceladas: quincenas.filter((q) => estadoQuincena(q) === 'cancelada').length,
  };
}
