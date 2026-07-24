/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../lib/geo', () => ({
  // Dentro sólo si lat coincide con el "sector" objetivo (marcamos con geometry.__id).
  isInside: vi.fn((lat: number, _lng: number, geom: any) => geom.__matchLat === lat),
}));
vi.mock('../lib/kml', () => ({ parseDescription: vi.fn(() => ({})) }));

import { useSectoresAmbiental } from './useSectoresAmbiental';

const sector = (id: string, matchLat: number | null, props: any = {}) => ({
  id, type: 'Feature' as const,
  geometry: { type: 'Polygon', __matchLat: matchLat } as any,
  properties: props,
});

beforeEach(() => {
  vi.clearAllMocks();
  // Evita que el effect de carga del KMZ haga fetch real.
  (globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: false }));
});

describe('useSectoresAmbiental', () => {
  it('isNocturnalGestor sólo para la cuenta nocturna', () => {
    const a = renderHook(() => useSectoresAmbiental([], { email: 'ambientenocturno@ambiente.gov.co' }));
    expect(a.result.current.isNocturnalGestor).toBe(true);
    const b = renderHook(() => useSectoresAmbiental([], { email: 'otro@x.co' }));
    expect(b.result.current.isNocturnalGestor).toBe(false);
  });

  it('activitySectorMap asocia la actividad al sector que la contiene', () => {
    const activities = [
      { id: 'a1', lat: 4.6, lng: -74 },
      { id: 'a2', lat: 9.9, lng: -74 },
      { id: 'sinCoord', lat: 0, lng: 0 },
    ] as any[];
    const { result } = renderHook(() => useSectoresAmbiental(activities, { email: 'x@x.co' }));
    act(() => result.current.setAllSectors([sector('s1', 4.6), sector('s2', 8.0)]));
    const map = result.current.activitySectorMap;
    expect(map.get('a1')).toEqual(['s1']);
    expect(map.has('a2')).toBe(false);
    expect(map.has('sinCoord')).toBe(false);
  });

  it('getSectorsCollectedToday filtra por el nombre del día actual en las properties', () => {
    const dayIndex = new Date().getDay();
    const todayName = [['DOMINGO'], ['LUNES'], ['MARTES'], ['MIERCOLES', 'MIÉRCOLES'], ['JUEVES'], ['VIERNES'], ['SABADO', 'SÁBADO']][dayIndex][0];
    const { result } = renderHook(() => useSectoresAmbiental([], { email: 'x@x.co' }));
    act(() => result.current.setAllSectors([
      sector('hoy', null, { dia: todayName }),
      sector('otro', null, { dia: 'ZZZZZ' }),
    ]));
    const hoy = result.current.getSectorsCollectedToday();
    expect(hoy.map(s => s.id)).toEqual(['hoy']);
  });
});
