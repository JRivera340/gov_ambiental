import { describe, it, expect } from 'vitest';
import { getPuntosModoCompleta, getPuntosModoEmergencia, getPuntosModoSinVisita, getPuntosModoAutomatico, getPuntosPorModo } from './rutaModos';
import type { ParadaRuta } from './ruta.types';

function parada(overrides: Partial<ParadaRuta>): ParadaRuta {
  return {
    numeroGlobal: 1, numeroSegmento: 0, puntoId: 'a1', lat: 4.6, lng: -74.08,
    barrio: 'Test', diasVencido: 0, tiposResiduo: [], visitado: false,
    diasSinSeguimiento: Infinity,
    ...overrides,
  };
}

describe('getPuntosModoCompleta', () => {
  it('incluye solo los no visitados esta semana', () => {
    const puntos = [parada({ puntoId: 'a', visitado: false }), parada({ puntoId: 'b', visitado: true })];
    expect(getPuntosModoCompleta(puntos).map(p => p.puntoId)).toEqual(['a']);
  });
});

describe('getPuntosModoEmergencia', () => {
  it('incluye solo los vencidos (diasVencido >= 4)', () => {
    const puntos = [parada({ puntoId: 'a', diasVencido: 5 }), parada({ puntoId: 'b', diasVencido: 1 })];
    expect(getPuntosModoEmergencia(puntos).map(p => p.puntoId)).toEqual(['a']);
  });
});

describe('getPuntosModoSinVisita', () => {
  it('incluye solo los que llevan mas de 7 dias sin seguimiento', () => {
    const puntos = [
      parada({ puntoId: 'a', diasSinSeguimiento: 8 }),
      parada({ puntoId: 'b', diasSinSeguimiento: 3 }),
      parada({ puntoId: 'c', diasSinSeguimiento: Infinity }),
    ];
    expect(getPuntosModoSinVisita(puntos).map(p => p.puntoId)).toEqual(['a', 'c']);
  });
});

describe('getPuntosModoAutomatico', () => {
  it('filtra por los ids que devolvio el backend, no recalcula nada', () => {
    const puntos = [parada({ puntoId: 'a' }), parada({ puntoId: 'b' }), parada({ puntoId: 'c' })];
    expect(getPuntosModoAutomatico(puntos, new Set(['a', 'c'])).map(p => p.puntoId)).toEqual(['a', 'c']);
  });

  it('set vacio no incluye nada', () => {
    const puntos = [parada({ puntoId: 'a' })];
    expect(getPuntosModoAutomatico(puntos, new Set())).toEqual([]);
  });
});

describe('getPuntosPorModo', () => {
  it('despacha al selector correcto segun el modo', () => {
    const puntos = [parada({ puntoId: 'a', visitado: false, diasVencido: 5, diasSinSeguimiento: 8 })];
    expect(getPuntosPorModo('completa', puntos)).toHaveLength(1);
    expect(getPuntosPorModo('emergencia', puntos)).toHaveLength(1);
    expect(getPuntosPorModo('sin_visita', puntos)).toHaveLength(1);
    expect(getPuntosPorModo('automatico', puntos, new Set(['a']))).toHaveLength(1);
  });
});
