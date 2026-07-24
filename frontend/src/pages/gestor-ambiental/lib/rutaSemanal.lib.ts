import type { ParadaRuta } from './ruta.types';
import type { ParadaLite, RutaSemanalDTO } from '../../../services/ambiental.service';

const BOGOTA_OFFSET_MS = 5 * 3600000;
const DAY = 86400000;

export function paradaLiteFromParadaRuta(p: ParadaRuta): ParadaLite {
  return { activityId: p.activityId, lat: p.lat, lng: p.lng, barrio: p.barrio, visitado: p.visitado };
}

export function hidratarParadas(dto: RutaSemanalDTO, puntos: ParadaRuta[]): ParadaRuta[] {
  const porId = new Map(puntos.map(p => [p.activityId, p]));
  return dto.paradas.map((lite, idx) => {
    const base = porId.get(lite.activityId);
    return {
      numeroGlobal: idx + 1,
      numeroSegmento: base?.numeroSegmento ?? 0,
      activityId: lite.activityId,
      lat: lite.lat,
      lng: lite.lng,
      barrio: lite.barrio,
      diasVencido: base?.diasVencido ?? 0,
      tiposResiduo: base?.tiposResiduo ?? [],
      visitado: base?.visitado ?? lite.visitado,
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
