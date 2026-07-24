// Ray Casting Algorithm para punto en polígono (soporta Polygon, MultiPolygon,
// GeometryCollection y huecos/holes).
export function isInside(lat: number, lng: number, geometry: any): boolean {
  if (!geometry) return false;

  const checkPolygon = (polygon: number[][][]) => {
    // polygon[0] es el exterior, polygon[1...n] son los huecos (holes)
    const exterior = polygon[0];
    let inside = false;

    for (let i = 0, j = exterior.length - 1; i < exterior.length; j = i++) {
      const xi = exterior[i][0], yi = exterior[i][1];
      const xj = exterior[j][0], yj = exterior[j][1];
      const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    if (!inside) return false;

    for (let k = 1; k < polygon.length; k++) {
      const hole = polygon[k];
      let inHole = false;
      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const xi = hole[i][0], yi = hole[i][1];
        const xj = hole[j][0], yj = hole[j][1];
        const intersect = ((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
        if (intersect) inHole = !inHole;
      }
      if (inHole) return false;
    }

    return true;
  };

  if (geometry.type === 'Polygon') {
    return checkPolygon(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.some((poly: number[][][]) => checkPolygon(poly));
  } else if (geometry.type === 'GeometryCollection') {
    return (geometry.geometries || []).some((g: any) => {
      if (g.type === 'Polygon' || g.type === 'MultiPolygon') return isInside(lat, lng, g);
      return false;
    });
  }
  return false;
}

import type { ParadaRuta } from './ruta.types';

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestNeighborRoute<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  points: T[]
): T[] {
  const route: T[] = [];
  const pending = [...points];
  let current: { lat: number; lng: number } = origin;

  while (pending.length > 0) {
    let minDist = Infinity;
    let minIdx = 0;
    for (let i = 0; i < pending.length; i++) {
      const d = haversineDistance(current.lat, current.lng, pending[i].lat, pending[i].lng);
      if (d < minDist) { minDist = d; minIdx = i; }
    }
    route.push(pending[minIdx]);
    current = pending[minIdx];
    pending.splice(minIdx, 1);
  }
  return route;
}

export function nearestNeighborRouteBounded<T extends { lat: number; lng: number }>(
  origin: { lat: number; lng: number },
  points: T[],
  destino: T
): T[] {
  const intermediates = points.filter(p => p !== destino);
  const route = nearestNeighborRoute(origin, intermediates);
  return [...route, destino];
}

export function buildGoogleMapsUrl(
  destLat: number,
  destLng: number,
  origin?: { lat: number; lng: number }
): string {
  const destination = `destination=${destLat},${destLng}`;
  if (!origin) return `https://www.google.com/maps/dir/?api=1&${destination}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&${destination}`;
}

export function openDirections(destLat: number, destLng: number): void {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => window.open(buildGoogleMapsUrl(destLat, destLng, { lat: pos.coords.latitude, lng: pos.coords.longitude }), '_blank'),
      () => window.open(buildGoogleMapsUrl(destLat, destLng), '_blank'),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    window.open(buildGoogleMapsUrl(destLat, destLng), '_blank');
  }
}

export function buildGoogleMapsUrls(paradas: ParadaRuta[]): string[] {
  const pendientes = paradas.filter(p => !p.visitado);
  if (pendientes.length === 0) return [];
  const urls: string[] = [];
  const CHUNK = 10; // origin + 8 waypoints + destination = 10 stops max
  for (let i = 0; i < pendientes.length; i += CHUNK) {
    const chunk = pendientes.slice(i, i + CHUNK);
    const originPt = chunk[0];
    const dest = chunk[chunk.length - 1];
    const wayptStr = chunk.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
    let url =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${originPt.lat},${originPt.lng}` +
      `&destination=${dest.lat},${dest.lng}` +
      `&travelmode=driving`;
    if (wayptStr) url += `&waypoints=${wayptStr}`;
    urls.push(url);
  }
  return urls;
}

export function calcularOrigenRecomendado(
  puntos: ParadaRuta[]
): ParadaRuta | null {
  if (puntos.length === 0) return null;
  const vencidos = puntos.filter(p => p.diasVencido >= 4);
  const candidatos = vencidos.length > 0 ? vencidos : puntos;

  return candidatos.reduce<ParadaRuta | null>((best, candidate) => {
    const others = puntos.filter(p => p.puntoId !== candidate.puntoId);
    const sorted = others
      .map(p => haversineDistance(candidate.lat, candidate.lng, p.lat, p.lng))
      .sort((a, b) => a - b);
    const avgDist =
      sorted.slice(0, 5).reduce((s, d) => s + d, 0) / Math.min(5, sorted.length || 1);

    if (!best) return candidate;
    const bestOthers = puntos.filter(p => p.puntoId !== best.puntoId);
    const bestSorted = bestOthers
      .map(p => haversineDistance(best.lat, best.lng, p.lat, p.lng))
      .sort((a, b) => a - b);
    const bestAvg =
      bestSorted.slice(0, 5).reduce((s, d) => s + d, 0) / Math.min(5, bestSorted.length || 1);

    return avgDist > bestAvg ? candidate : best;
  }, null);
}
