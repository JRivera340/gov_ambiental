export type EventoGeo = { id: string; lat: number; lng: number; barrio: string; fechaMs: number };
export type ClusterReincidente = {
  barrio: string; lat: number; lng: number;
  eventos: number; primeraMs: number; ultimaMs: number; ids: string[];
};

function haversineMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toR = Math.PI / 180;
  const dl = (b.lat - a.lat) * toR, dg = (b.lng - a.lng) * toR;
  const x = Math.sin(dl / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dg / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function detectarReincidencia(
  eventos: EventoGeo[],
  radioMetros = 60,
  minEventos = 2,
): ClusterReincidente[] {
  type Acc = { latSum: number; lngSum: number; n: number; barrio: string; primeraMs: number; ultimaMs: number; ids: string[] };
  const clusters: Acc[] = [];
  for (const e of eventos) {
    const centro = clusters.find(c =>
      haversineMetros({ lat: c.latSum / c.n, lng: c.lngSum / c.n }, e) <= radioMetros);
    if (centro) {
      centro.latSum += e.lat; centro.lngSum += e.lng; centro.n++;
      centro.primeraMs = Math.min(centro.primeraMs, e.fechaMs);
      centro.ultimaMs = Math.max(centro.ultimaMs, e.fechaMs);
      centro.ids.push(e.id);
    } else {
      clusters.push({ latSum: e.lat, lngSum: e.lng, n: 1, barrio: e.barrio, primeraMs: e.fechaMs, ultimaMs: e.fechaMs, ids: [e.id] });
    }
  }
  return clusters
    .filter(c => c.n >= minEventos)
    .map(c => ({
      barrio: c.barrio, lat: c.latSum / c.n, lng: c.lngSum / c.n,
      eventos: c.n, primeraMs: c.primeraMs, ultimaMs: c.ultimaMs, ids: c.ids,
    }))
    .sort((a, b) => b.eventos - a.eventos);
}
