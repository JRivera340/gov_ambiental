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

  it('una sola parada queda en el segmento A', () => {
    const segs = buildSegmentos(paradas(1));
    expect(segs).toHaveLength(1);
    expect(segs[0].id).toBe('A');
    expect(segs[0].label).toContain('puntos 1 al 1');
  });

  it('parte la ruta en dos tramos, sin importar el tamano', () => {
    const segs = buildSegmentos(paradas(54));
    expect(segs).toHaveLength(2);
    expect(segs[0].id).toBe('A');
    expect(segs[0].paradas).toHaveLength(27);
    expect(segs[0].label).toContain('puntos 1 al 27');
    expect(segs[1].id).toBe('B');
    expect(segs[1].paradas).toHaveLength(27);
    expect(segs[1].label).toContain('puntos 28 al 54');
  });

  it('con cantidad impar el primer tramo se queda con la parada de mas', () => {
    const segs = buildSegmentos(paradas(25));
    expect(segs.map((s) => s.paradas.length)).toEqual([13, 12]);
    expect(segs[1].label).toContain('puntos 14 al 25');
  });

  it('renumera cada parada dentro de su segmento (numeroSegmento)', () => {
    const segs = buildSegmentos(paradas(30));
    expect(segs[0].paradas[0].numeroSegmento).toBe(1);
    expect(segs[0].paradas[14].numeroSegmento).toBe(15);
    expect(segs[1].paradas[0].numeroSegmento).toBe(1);
    expect(segs[1].paradas[14].numeroSegmento).toBe(15);
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
