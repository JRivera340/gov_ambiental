import type { RutaSemanalDTO } from '../../../../services/ambiental.service';

// Resumen de una ruta cerrada para el historial del admin.
//
// El historial del gestor vive en localStorage (lib/ruta.ts), así que el admin
// no podía verlo. Acá se arma desde la fila de `ruta_semanal`, que siempre tuvo
// el dato completo: paradas congeladas al crear la ruta, `visitado` marcado
// durante el recorrido y `arrastre` calculado al cerrarse la quincena.

export type RutaResumen = {
  id: string;
  inicioISO: string;
  finISO: string;
  estado: RutaSemanalDTO['estado'];
  /** Momento real de cierre o cancelación; cae al fin de la quincena si falta. */
  cerradaISO: string;
  planificados: number;
  visitados: number;
  pct: number;
  /** Puntos que quedaron sin visitar al cerrarse. */
  pendientes: number;
};

export function resumirRuta(dto: RutaSemanalDTO): RutaResumen {
  const paradas = dto.paradas ?? [];
  const visitados = paradas.filter((p) => p.visitado).length;
  // `arrastre` solo se calcula cuando la quincena se cierra sola. Para una ruta
  // cancelada a mitad de camino se deriva de las paradas, o el panel mostraría
  // 0 pendientes en rutas que quedaron a medias.
  const pendientes = dto.arrastre?.length
    ? dto.arrastre.length
    : paradas.length - visitados;
  return {
    id: dto.id,
    inicioISO: dto.semanaInicio,
    finISO: dto.semanaFin,
    estado: dto.estado,
    cerradaISO: dto.updatedAt ?? dto.semanaFin,
    planificados: paradas.length,
    visitados,
    pct: paradas.length > 0 ? Math.round((visitados / paradas.length) * 100) : 0,
    pendientes,
  };
}

/** Acumulado de todo el historial, para la cabecera del panel. */
export function totalesHistorial(rutas: RutaResumen[]): {
  quincenas: number;
  planificados: number;
  visitados: number;
  pct: number;
  canceladas: number;
} {
  const planificados = rutas.reduce((t, r) => t + r.planificados, 0);
  const visitados = rutas.reduce((t, r) => t + r.visitados, 0);
  return {
    quincenas: rutas.length,
    planificados,
    visitados,
    pct: planificados > 0 ? Math.round((visitados / planificados) * 100) : 0,
    canceladas: rutas.filter((r) => r.estado === 'cancelada').length,
  };
}
