import type { ParadaRuta } from './ruta.types';
import type { ParadaLite, RutaSemanalDTO } from '../../../services/ambiental.service';

const BOGOTA_OFFSET_MS = 5 * 3600000;
const DAY = 86400000;

export function paradaLiteFromParadaRuta(p: ParadaRuta): ParadaLite {
  return { puntoId: p.puntoId, lat: p.lat, lng: p.lng, barrio: p.barrio, visitado: p.visitado };
}

// Cruza las paradas congeladas de la ruta (lo que se guardó al crearla) con
// el estado actual de los puntos del gestor. Dos cosas importantes:
//
// 1. `visitado` sale SIEMPRE del catálogo actual (`puntos`, que ya viene
//    cruzado con GET /visitas/plan). Lo guardado en la fila de la ruta se
//    congela al crearla y nunca se actualiza, así que usarlo dejaba todos los
//    segmentos en 0% aunque el gestor ya hubiera recorrido medio barrio.
// 2. Las paradas de puntos que ya no son del gestor (reasignados o
//    eliminados) se descartan: la ruta mostraba más puntos de los que el
//    gestor tiene asignados. Solo se filtra si hay catálogo cargado — si
//    todavía no llegó, se muestran las paradas tal cual.
export function hidratarParadas(dto: RutaSemanalDTO, puntos: ParadaRuta[]): ParadaRuta[] {
  const porId = new Map(puntos.map(p => [p.puntoId, p]));
  const vigentes = porId.size > 0
    ? dto.paradas.filter(lite => porId.has(lite.puntoId))
    : dto.paradas;
  return vigentes.map((lite, idx) => {
    const base = porId.get(lite.puntoId);
    return {
      numeroGlobal: idx + 1,
      numeroSegmento: base?.numeroSegmento ?? 0,
      puntoId: lite.puntoId,
      lat: lite.lat,
      lng: lite.lng,
      barrio: lite.barrio,
      diasVencido: base?.diasVencido ?? 0,
      tiposResiduo: base?.tiposResiduo ?? [],
      visitado: base ? base.visitado : lite.visitado,
      diasSinSeguimiento: base?.diasSinSeguimiento ?? Infinity,
      fechaVisita: base?.fechaVisita,
      pendienteAnterior: base?.pendienteAnterior,
    };
  });
}

export function diasRestantesSemana(finISO: string, ahora: Date): number {
  const ms = new Date(finISO).getTime() - ahora.getTime();
  return Math.max(0, Math.ceil(ms / DAY));
}

export function esLunesBogota(ahora: Date): boolean {
  const bogota = new Date(ahora.getTime() - BOGOTA_OFFSET_MS);
  return bogota.getUTCDay() === 1;
}
