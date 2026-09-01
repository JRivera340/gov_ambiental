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

export type MesHistorial = {
  /** Índice del mes: año*12 + mes. Ordena y sirve de key. */
  clave: number;
  /** ISO del inicio de la primera quincena del mes, para etiquetar. */
  inicioISO: string;
  quincenas: QuincenaHistorialDTO[];
  planificados: number;
  visitados: number;
  pct: number;
};

// Agrupa las quincenas por mes. Cada mes tiene dos (1-15 y 16-fin), así que el
// supervisor puede leer el mes completo sin sumar a mano.
//
// El índice de quincena que manda el backend es (año*12 + mes)*2 + mitad, así
// que el mes se recupera dividiendo por 2 — sin volver a parsear fechas ni
// arriesgar un desfase de zona horaria.
export function agruparPorMes(quincenas: QuincenaHistorialDTO[]): MesHistorial[] {
  const porMes = new Map<number, MesHistorial>();

  for (const q of quincenas) {
    const clave = Math.floor(q.indice / 2);
    let mes = porMes.get(clave);
    if (!mes) {
      mes = { clave, inicioISO: q.inicioISO, quincenas: [], planificados: 0, visitados: 0, pct: 0 };
      porMes.set(clave, mes);
    }
    mes.quincenas.push(q);
    mes.planificados += q.planificados;
    mes.visitados += q.visitados;
  }

  const meses = [...porMes.values()].sort((a, b) => b.clave - a.clave);
  for (const mes of meses) {
    // Más reciente primero dentro del mes: la segunda quincena arriba.
    mes.quincenas.sort((a, b) => b.indice - a.indice);
    // La etiqueta sale de la quincena más temprana del mes: la segunda termina
    // a las 00:00 del mes siguiente y nombraría el mes equivocado.
    mes.inicioISO = mes.quincenas[mes.quincenas.length - 1].inicioISO;
    mes.pct = mes.planificados > 0 ? Math.round((mes.visitados / mes.planificados) * 100) : 0;
  }
  return meses;
}
