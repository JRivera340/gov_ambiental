import { describe, it, expect } from 'vitest';
import { getPuntosModoCompleta, getPuntosModoEmergencia, getPuntosModoSinVisita, getPuntosPorModo } from './rutaModos';
import type { ParadaRuta } from './ruta.types';

function parada(overrides: Partial<ParadaRuta>): ParadaRuta {
  return {
    numeroGlobal: 1, numeroSegmento: 0, activityId: 'a1', lat: 4.6, lng: -74.08,
    barrio: 'Test', diasVencido: 0, tiposResiduo: [], visitado: false,
    diasSinSeguimiento: Infinity,
    ...overrides,
  };
}

describe('getPuntosModoCompleta', () => {
  it('incluye solo los no visitados esta semana', () => {
    const puntos = [parada({ activityId: 'a', visitado: false }), parada({ activityId: 'b', visitado: true })];
    expect(getPuntosModoCompleta(puntos).map(p => p.activityId)).toEqual(['a']);
  });
});

describe('getPuntosModoEmergencia', () => {
  it('incluye solo los vencidos (diasVencido >= 4)', () => {
    const puntos = [parada({ activityId: 'a', diasVencido: 5 }), parada({ activityId: 'b', diasVencido: 1 })];
    expect(getPuntosModoEmergencia(puntos).map(p => p.activityId)).toEqual(['a']);
  });
});

describe('getPuntosModoSinVisita', () => {
  it('incluye solo los que llevan mas de 7 dias sin seguimiento', () => {
    const puntos = [
      parada({ activityId: 'a', diasSinSeguimiento: 8 }),
      parada({ activityId: 'b', diasSinSeguimiento: 3 }),
      parada({ activityId: 'c', diasSinSeguimiento: Infinity }),
    ];
    expect(getPuntosModoSinVisita(puntos).map(p => p.activityId)).toEqual(['a', 'c']);
  });
});

describe('getPuntosPorModo', () => {
  it('despacha al selector correcto segun el modo', () => {
    const puntos = [parada({ activityId: 'a', visitado: false, diasVencido: 5, diasSinSeguimiento: 8 })];
    expect(getPuntosPorModo('completa', puntos)).toHaveLength(1);
    expect(getPuntosPorModo('emergencia', puntos)).toHaveLength(1);
    expect(getPuntosPorModo('sin_visita', puntos)).toHaveLength(1);
  });
});
