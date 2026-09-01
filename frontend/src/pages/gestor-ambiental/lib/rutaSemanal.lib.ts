import type { ParadaRuta } from './ruta.types';
import type { ParadaLite, RutaSemanalDTO } from '../../../services/ambiental.service';

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

export function diasRestantesQuincena(finISO: string, ahora: Date): number {
  const ms = new Date(finISO).getTime() - ahora.getTime();
  return Math.max(0, Math.ceil(ms / DAY));
}

// La quincena es de calendario (1 al 15, 16 al fin de mes), así que su largo
// NO es fijo: 15 días la primera, y 13/14/15/16 la segunda según el mes. Se
// deriva del rango que manda el backend en vez de asumir un número.
export function diasDeQuincena(
  inicioISO: string | null | undefined,
  finISO: string | null | undefined,
): number {
  if (!inicioISO || !finISO) return 0;
  return Math.round((new Date(finISO).getTime() - new Date(inicioISO).getTime() + 1) / DAY);
}

// Día en curso de la quincena (1..N). 0 si todavía no arrancó o si no llegó el
// plan. Espeja diaDeQuincena del backend (ciclo-quincenal.util.ts).
export function diaDeQuincena(
  inicioISO: string | null | undefined,
  finISO: string | null | undefined,
  ahora: Date,
): number {
  if (!inicioISO || !finISO) return 0;
  const transcurrido = ahora.getTime() - new Date(inicioISO).getTime();
  if (transcurrido < 0) return 0;
  return Math.min(diasDeQuincena(inicioISO, finISO), Math.floor(transcurrido / DAY) + 1);
}
