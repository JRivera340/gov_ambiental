import { describe, it, expect, vi } from 'vitest';

// leaflet requiere DOM; solo se usa para crear íconos (no probado aquí).
vi.mock('leaflet', () => ({ DivIcon: class { constructor(_opts: unknown) {} } }));

import {
  getResiduoLabel,
  findTechnicalResidueKey,
  getResiduos,
  getPuntoCriticoTier,
  isPuntoEmergencia,
  isPuntoRecogido,
  isInside,
  getAllLocations,
  getFirstDayOfMonth,
  getLastDayOfMonth,
} from './adminHelpers';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe('getResiduoLabel', () => {
  it('mapea el key técnico a etiqueta legible', () => {
    expect(getResiduoLabel('RESIDUOS_ORDINARIOS')).toBe('Ordinarios');
  });
  it('es insensible a mayúsculas y espacios', () => {
    expect(getResiduoLabel('  residuos_ordinarios ')).toBe('Ordinarios');
  });
  it('devuelve undefined para vacío o desconocido', () => {
    expect(getResiduoLabel('')).toBeUndefined();
    expect(getResiduoLabel('NO_EXISTE')).toBeUndefined();
  });
});

describe('findTechnicalResidueKey', () => {
  it('resuelve una etiqueta legible al key técnico', () => {
    expect(findTechnicalResidueKey('Ordinarios')).toBe('RESIDUOS_ORDINARIOS');
  });
  it('deja pasar un key técnico existente', () => {
    expect(findTechnicalResidueKey('RESIDUOS_ORDINARIOS')).toBe('RESIDUOS_ORDINARIOS');
  });
  it('cae al primer key técnico si no reconoce el valor', () => {
    expect(findTechnicalResidueKey('cualquier-cosa')).toBe('RESIDUOS_ORDINARIOS');
  });
});

describe('getResiduos', () => {
  it('devuelve el array de residuos cuando existe (columna propia, no operativoData)', () => {
    const a: any = { residuos: [{ id: '1', recogido: true }] };
    expect(getResiduos(a)).toHaveLength(1);
  });
  it('devuelve [] cuando no hay residuos', () => {
    expect(getResiduos({ residuos: [] } as any)).toEqual([]);
    expect(getResiduos({} as any)).toEqual([]);
  });
});

describe('criticidad de puntos (umbral unificado con el backend: 4 dias)', () => {
  const punto = (residuos: any[]): any => ({ residuos });

  it('tier 2 (crítico) con pendiente de 5 días', () => {
    const a = punto([{ id: '1', recogido: false, dateTime: daysAgo(5) }]);
    expect(getPuntoCriticoTier(a)).toBe(2);
    expect(isPuntoEmergencia(a)).toBe(true);
  });
  it('tier 1 (pendiente pero no vencido) con 2 días', () => {
    const a = punto([{ id: '1', recogido: false, dateTime: daysAgo(2) }]);
    expect(getPuntoCriticoTier(a)).toBe(1);
    expect(isPuntoEmergencia(a)).toBe(false);
  });
  it('tier 0 y recogido si todos los residuos están recogidos', () => {
    const a = punto([{ id: '1', recogido: true, dateTime: daysAgo(5) }]);
    expect(getPuntoCriticoTier(a)).toBe(0);
    expect(isPuntoEmergencia(a)).toBe(false);
    expect(isPuntoRecogido(a)).toBe(true);
  });
  it('sin residuos no es emergencia', () => {
    expect(isPuntoEmergencia(punto([]))).toBe(false);
  });
});

describe('isInside (ray casting)', () => {
  const square = {
    type: 'Polygon',
    coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
  };
  it('detecta un punto dentro del polígono', () => {
    expect(isInside(5, 5, square)).toBe(true);
  });
  it('detecta un punto fuera del polígono', () => {
    expect(isInside(20, 20, square)).toBe(false);
  });
  it('devuelve false sin geometría', () => {
    expect(isInside(5, 5, null)).toBe(false);
  });
});

describe('getAllLocations', () => {
  it('incluye la ubicación principal y las adicionales de espacio público', () => {
    const a: any = {
      lat: 4.6, lng: -74.08,
      operativoCategoria: 'ESPACIO_PUBLICO',
      operativoData: { additionalLocations: [{ lat: 4.61, lng: -74.09 }] },
    };
    expect(getAllLocations(a)).toHaveLength(2);
  });
  it('devuelve [] para actividad nula', () => {
    expect(getAllLocations(null)).toEqual([]);
  });
});

describe('helpers de fecha', () => {
  it('devuelven fechas en formato YYYY-MM-DD', () => {
    expect(getFirstDayOfMonth()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(getLastDayOfMonth()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('el primer día del mes termina en 01', () => {
    expect(getFirstDayOfMonth().endsWith('01')).toBe(true);
  });
});
