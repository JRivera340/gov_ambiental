import { describe, it, expect } from 'vitest';
import { buildSegmentos, segmentoEstado } from './ruta';
import type { ParadaRuta } from './ruta.types';

const parada = (overrides?: Partial<ParadaRuta>): ParadaRuta => ({
  numeroGlobal: 1,
  numeroSegmento: 1,
  puntoId: 'test-activity',
  lat: 0,
  lng: 0,
  barrio: 'test-barrio',
  diasVencido: 0,
  tiposResiduo: [],
  visitado: false,
  diasSinSeguimiento: 0,
  ...overrides,
});

const paradas = (n: number): any[] =>
  Array.from({ length: n }, (_, i) => ({ puntoId: `a${i}`, numeroGlobal: i + 1 }));

describe('buildSegmentos', () => {
  it('devuelve [] sin paradas', () => {
    expect(buildSegmentos([])).toEqual([]);
  });

  it('agrupa 25 paradas en un solo segmento A', () => {
    const segs = buildSegmentos(paradas(25));
    expect(segs).toHaveLength(1);
    expect(segs[0].id).toBe('A');
    expect(segs[0].paradas).toHaveLength(25);
    expect(segs[0].label).toContain('puntos 1 al 25');
    expect(segs[0].estado).toBe('pendiente');
  });

  it('parte en segmentos de 25', () => {
    const segs = buildSegmentos(paradas(30));
    expect(segs).toHaveLength(2);
    expect(segs[0].id).toBe('A');
    expect(segs[0].paradas).toHaveLength(25);
    expect(segs[1].id).toBe('B');
    expect(segs[1].paradas).toHaveLength(5);
    expect(segs[1].label).toContain('puntos 26 al 30');
  });

  it('renumera cada parada dentro de su segmento (numeroSegmento)', () => {
    const segs = buildSegmentos(paradas(30));
    expect(segs[0].paradas[0].numeroSegmento).toBe(1);
    expect(segs[0].paradas[24].numeroSegmento).toBe(25);
    expect(segs[1].paradas[0].numeroSegmento).toBe(1);
    expect(segs[1].paradas[4].numeroSegmento).toBe(5);
  });
});

describe('segmentoEstado', () => {
  it('pendiente si no hay paradas o ninguna visitada', () => {
    expect(segmentoEstado([])).toBe('pendiente');
    expect(segmentoEstado([parada({ visitado: false }), parada({ visitado: false })])).toBe('pendiente');
  });

  it('en_progreso si algunas paradas estan visitadas', () => {
    expect(segmentoEstado([parada({ visitado: true }), parada({ visitado: false })])).toBe('en_progreso');
  });

  it('completado si todas las paradas estan visitadas', () => {
    expect(segmentoEstado([parada({ visitado: true }), parada({ visitado: true })])).toBe('completado');
  });
});
