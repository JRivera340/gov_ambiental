import { describe, it, expect } from 'vitest';
import {
  tiempoMedioRecoleccionDias, pctPuntosSinPendientes, residuosPorTipo, puntosReincidentes, eventosDesdePuntos, puntosVencidos,
} from './indicadoresAmbiental.lib';

const punto = (id: string, barrio: string, residuos: any[], lat = 4.6, lng = -74.07): any => ({
  id, barrio, lat, lng, dateTime: '2026-07-01T00:00:00Z',
  residuos,
});
const r = (tipo: string, recogido: boolean, dateTime?: string, fechaRecogida?: string) =>
  ({ id: Math.random().toString(), tipoResiduo: tipo, recogido, dateTime, fechaRecogida });

describe('tiempoMedioRecoleccionDias', () => {
  it('promedia (fechaRecogida - dateTime) de recogidos', () => {
    const p = [punto('p', 'X', [
      r('ORD', true, '2026-07-01T00:00:00Z', '2026-07-04T00:00:00Z'), // 3 días
      r('ORD', true, '2026-07-01T00:00:00Z', '2026-07-05T00:00:00Z'), // 4 días
    ])];
    expect(tiempoMedioRecoleccionDias(p)).toBeCloseTo(3.5, 1);
  });
  it('0 si no hay recogidos', () => {
    expect(tiempoMedioRecoleccionDias([punto('p', 'X', [r('ORD', false)])])).toBe(0);
  });
});

describe('pctPuntosSinPendientes', () => {
  it('% de puntos con todo recogido sobre los que tienen residuos', () => {
    const ps = [
      punto('a', 'X', [r('ORD', true)]),           // atendido
      punto('b', 'X', [r('ORD', true), r('ORD', false)]), // pendiente
    ];
    expect(pctPuntosSinPendientes(ps)).toBe(50);
  });
});

describe('residuosPorTipo', () => {
  it('agrega total y recogidos por tipo', () => {
    const ps = [punto('a', 'X', [r('ORD', true), r('ORD', false), r('ESC', true)])];
    const out = residuosPorTipo(ps);
    expect(out.find(t => t.tipo === 'ORD')).toEqual({ tipo: 'ORD', total: 2, recogidos: 1 });
    expect(out.find(t => t.tipo === 'ESC')).toEqual({ tipo: 'ESC', total: 1, recogidos: 1 });
  });
  it('ordena por total descendente', () => {
    const ps = [punto('a', 'X', [r('ORD', true), r('ORD', false), r('ESC', true)])];
    const out = residuosPorTipo(ps);
    expect(out[0].total).toBeGreaterThanOrEqual(out[1].total);
  });
});

describe('puntosReincidentes', () => {
  it('punto con >=2 ciclos es reincidente', () => {
    const ps = [
      punto('a', 'X', [r('ORD', true), r('ORD', true), r('ORD', false)]), // 2 recogidos + pendiente = 3 ciclos
      punto('b', 'Y', [r('ORD', true)]),                                   // 1 ciclo
    ];
    const out = puntosReincidentes(ps, 2);
    expect(out.map(p => p.puntoResiduoId)).toEqual(['a']);
    expect(out[0].ciclos).toBe(3);
  });
});

describe('eventosDesdePuntos', () => {
  it('mapea punto a EventoGeo', () => {
    const out = eventosDesdePuntos([punto('a', 'X', [], 4.6, -74.07)]);
    expect(out[0]).toMatchObject({ id: 'a', lat: 4.6, lng: -74.07, barrio: 'X' });
    expect(typeof out[0].fechaMs).toBe('number');
  });
});

describe('puntosVencidos', () => {
  it('filtra puntos con todos residuos recogido (no hay emergencia)', () => {
    const ps = [
      punto('a', 'X', [r('ORD', true), r('ESC', true)]),
      punto('b', 'Y', [r('ORD', true)]),
    ];
    const out = puntosVencidos(ps);
    expect(out).toEqual([]);
  });
});
