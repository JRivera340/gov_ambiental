import { describe, it, expect, vi } from 'vitest';

// leaflet requiere DOM; el mock guarda las opciones para poder inspeccionar
// el html generado (mask-image) sin necesitar un DOM real.
vi.mock('leaflet', () => ({
  DivIcon: class { options: any; constructor(opts: unknown) { this.options = opts; } },
}));

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
  createMarkerIcon,
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
  it('devuelve el array de residuos desde activity.residuos', () => {
    const a: any = { residuos: [{ id: '1', recogido: true }] };
    expect(getResiduos(a)).toHaveLength(1);
  });
  it('devuelve [] cuando no hay residuos', () => {
    expect(getResiduos({} as any)).toEqual([]);
  });
});

describe('criticidad de puntos', () => {
  const punto = (residuos: any[]): any => ({
    operativoSubtipo: 'AMBIENTAL_PUNTOS_ACUMULACION',
    residuos,
  });

  it('tier 2 (crítico) con pendiente de 5 días', () => {
    const a = punto([{ id: '1', recogido: false, dateTime: daysAgo(5) }]);
    expect(getPuntoCriticoTier(a)).toBe(2);
    expect(isPuntoEmergencia(a)).toBe(true);
  });
  it('tier 1 con pendiente de 2 días', () => {
    const a = punto([{ id: '1', recogido: false, dateTime: daysAgo(2) }]);
    expect(getPuntoCriticoTier(a)).toBe(1);
  });
  it('tier 0 y recogido si todos los residuos están recogidos', () => {
    const a = punto([{ id: '1', recogido: true, dateTime: daysAgo(5) }]);
    expect(getPuntoCriticoTier(a)).toBe(0);
    expect(isPuntoEmergencia(a)).toBe(false);
    expect(isPuntoRecogido(a)).toBe(true);
  });
  it('una actividad no-acumulación nunca es emergencia', () => {
    expect(isPuntoEmergencia({ operativoSubtipo: 'AMBIENTAL' } as any)).toBe(false);
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
  it('incluye la ubicación principal de la actividad', () => {
    const a: any = { lat: 4.6, lng: -74.08 };
    expect(getAllLocations(a)).toHaveLength(1);
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

describe('createMarkerIcon', () => {
  it('siempre usa /icons/Residuos.png, sin importar cat/subtipo (mono-dominio, sin /icons/Ambiental.png ni /icons/EspacioPublico.png reales)', () => {
    const icon = createMarkerIcon('#7c2d12', 'AMBIENTAL', undefined, 5) as any;
    expect(icon.options.html).toContain("url('/icons/Residuos.png')");
    expect(icon.options.html).not.toContain('Ambiental.png');
    expect(icon.options.html).not.toContain('EspacioPublico.png');
    expect(icon.options.html).not.toContain('IVC.png');
  });

  it('ignora cat/subtipo aunque vengan con valores del hub (IVC, ESPACIO_PUBLICO, etc.)', () => {
    const icon = createMarkerIcon('#000', 'IVC', 'AMBIENTAL_PUNTOS_ACUMULACION') as any;
    expect(icon.options.html).toContain("url('/icons/Residuos.png')");
  });
});
