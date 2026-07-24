import { describe, it, expect } from 'vitest';
import {
  haversineDistance,
  nearestNeighborRoute,
  nearestNeighborRouteBounded,
  calcularOrigenRecomendado,
  buildGoogleMapsUrls,
  buildGoogleMapsUrl,
  isInside,
} from './geo';

describe('haversineDistance', () => {
  it('es 0 para el mismo punto', () => {
    expect(haversineDistance(4.6, -74.08, 4.6, -74.08)).toBe(0);
  });
  it('crece con la separación', () => {
    const cerca = haversineDistance(0, 0, 0, 0.001);
    const lejos = haversineDistance(0, 0, 0, 0.01);
    expect(lejos).toBeGreaterThan(cerca);
  });
});

describe('nearestNeighborRoute', () => {
  it('visita siempre el punto más cercano primero', () => {
    const origin = { lat: 0, lng: 0 };
    const points = [
      { lat: 5, lng: 0, id: 'B' },
      { lat: 1, lng: 0, id: 'A' },
      { lat: 2, lng: 0, id: 'C' },
    ];
    const route = nearestNeighborRoute(origin, points);
    expect(route.map((p) => p.id)).toEqual(['A', 'C', 'B']);
  });
});

describe('nearestNeighborRouteBounded', () => {
  it('deja el destino siempre al final aunque fuese el más cercano', () => {
    const origin = { lat: 0, lng: 0 };
    const A = { lat: 1, lng: 0, id: 'A' };
    const B = { lat: 5, lng: 0, id: 'B' };
    const C = { lat: 2, lng: 0, id: 'C' };
    const route = nearestNeighborRouteBounded(origin, [A, B, C], A);
    expect(route[route.length - 1].id).toBe('A');
  });
});

describe('calcularOrigenRecomendado', () => {
  it('devuelve null sin puntos', () => {
    expect(calcularOrigenRecomendado([])).toBeNull();
  });

  it('elige el punto más periférico (mayor distancia media a los demás)', () => {
    const puntos: any[] = [
      { puntoId: 'c1', lat: 0, lng: 0, diasVencido: 0 },
      { puntoId: 'c2', lat: 0, lng: 0.001, diasVencido: 0 },
      { puntoId: 'c3', lat: 0, lng: 0.002, diasVencido: 0 },
      { puntoId: 'far', lat: 1, lng: 1, diasVencido: 0 },
    ];
    expect(calcularOrigenRecomendado(puntos)?.puntoId).toBe('far');
  });

  it('prioriza los puntos vencidos como candidatos', () => {
    const puntos: any[] = [
      { puntoId: 'vencido', lat: 0, lng: 0, diasVencido: 6 },
      { puntoId: 'far', lat: 1, lng: 1, diasVencido: 0 },
      { puntoId: 'c', lat: 0, lng: 0.001, diasVencido: 0 },
    ];
    expect(calcularOrigenRecomendado(puntos)?.puntoId).toBe('vencido');
  });
});

describe('buildGoogleMapsUrls', () => {
  it('ignora las paradas ya visitadas', () => {
    const paradas: any[] = [
      { lat: 1, lng: 1, visitado: true },
      { lat: 2, lng: 2, visitado: false },
      { lat: 3, lng: 3, visitado: false },
    ];
    const urls = buildGoogleMapsUrls(paradas);
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('origin=2,2');
    expect(urls[0]).toContain('destination=3,3');
  });
  it('devuelve [] si no hay pendientes', () => {
    expect(buildGoogleMapsUrls([{ lat: 1, lng: 1, visitado: true } as any])).toEqual([]);
  });
});

describe('buildGoogleMapsUrl', () => {
  it('genera URL de destino sin origen', () => {
    expect(buildGoogleMapsUrl(4.6, -74.08)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=4.6,-74.08'
    );
  });

  it('genera URL con origen cuando se provee', () => {
    expect(buildGoogleMapsUrl(4.6, -74.08, { lat: 4.5, lng: -74.07 })).toBe(
      'https://www.google.com/maps/dir/?api=1&origin=4.5,-74.07&destination=4.6,-74.08'
    );
  });
});

describe('isInside', () => {
  const square = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] };
  it('detecta un punto dentro', () => {
    expect(isInside(5, 5, square)).toBe(true);
  });
  it('detecta un punto fuera', () => {
    expect(isInside(20, 20, square)).toBe(false);
  });
});
