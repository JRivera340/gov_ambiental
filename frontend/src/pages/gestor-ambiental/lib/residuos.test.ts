import { describe, it, expect } from 'vitest';
import { getResiduos, isPuntoEmergencia, isPuntoRecogido } from './residuos';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe('getResiduos', () => {
  it('devuelve el array de residuos (columna propia, no operativoData)', () => {
    const a: any = { residuos: [{ id: 'r1', recogido: false }], dateTime: daysAgo(1) };
    const res = getResiduos(a);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('r1');
  });

  it('completa dateTime del residuo con el de la actividad si falta', () => {
    const a: any = { residuos: [{ id: 'r1', recogido: false }], dateTime: daysAgo(3), createdAt: daysAgo(5) };
    const res = getResiduos(a);
    expect(res[0].dateTime).toBe(daysAgo(3));
  });

  it('devuelve [] sin residuos', () => {
    expect(getResiduos({ residuos: [] } as any)).toEqual([]);
    expect(getResiduos({} as any)).toEqual([]);
  });
});

describe('isPuntoEmergencia', () => {
  const punto = (residuos: any[]): any => ({ residuos });

  it('es emergencia con un pendiente de 4+ días', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: false, dateTime: daysAgo(5) }]))).toBe(true);
  });
  it('no es emergencia con menos de 4 días', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: false, dateTime: daysAgo(2) }]))).toBe(false);
  });
  it('no es emergencia si el residuo viejo ya está recogido', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: true, dateTime: daysAgo(9) }]))).toBe(false);
  });
  it('sin residuos no es emergencia', () => {
    expect(isPuntoEmergencia(punto([]))).toBe(false);
  });
});

describe('isPuntoRecogido', () => {
  const punto = (residuos: any[]): any => ({ residuos });

  it('es recogido si todos los residuos lo están', () => {
    expect(isPuntoRecogido(punto([{ id: 'r1', recogido: true }, { id: 'r2', recogido: true }]))).toBe(true);
  });
  it('no es recogido si hay al menos uno pendiente', () => {
    expect(isPuntoRecogido(punto([{ id: 'r1', recogido: true }, { id: 'r2', recogido: false }]))).toBe(false);
  });
  it('no es recogido si no tiene residuos', () => {
    expect(isPuntoRecogido(punto([]))).toBe(false);
  });
});
