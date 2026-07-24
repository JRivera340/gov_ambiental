import { describe, it, expect } from 'vitest';
import { getResiduos, isPuntoEmergencia, isPuntoRecogido } from './residuos';

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe('getResiduos', () => {
  it('devuelve el array de residuos cuando existe', () => {
    const a: any = { operativoData: { residuos: [{ id: 'r1', recogido: false }] }, dateTime: daysAgo(1) };
    const res = getResiduos(a);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('r1');
  });

  it('reconstruye el formato legacy plano con id legacy-0', () => {
    const a: any = { operativoData: { tipoResiduo: 'ESCOMBROS', areaLinealMetros: 8 }, dateTime: daysAgo(1), createdAt: daysAgo(2), photos: [] };
    const res = getResiduos(a);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('legacy-0');
    expect(res[0].tipoResiduo).toBe('ESCOMBROS');
    expect(res[0].recogido).toBe(false);
  });

  it('detecta el formato de encuesta (claves UUID) con id legacy-survey', () => {
    const a: any = {
      operativoData: { q1: 'RESIDUOS_ORDINARIOS', q2: 'COMUNIDAD', q3: 15 },
      dateTime: daysAgo(1),
      photos: [],
    };
    const res = getResiduos(a);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('legacy-survey');
    expect(res[0].tipoResiduo).toBe('RESIDUOS_ORDINARIOS');
    expect(res[0].quienDispuso).toBe('COMUNIDAD');
    expect(res[0].areaLinealMetros).toBe(15);
  });

  it('devuelve [] sin datos de residuo', () => {
    expect(getResiduos({ operativoData: {} } as any)).toEqual([]);
  });
});

describe('isPuntoEmergencia', () => {
  const punto = (residuos: any[]): any => ({
    operativoSubtipo: 'AMBIENTAL_PUNTOS_ACUMULACION',
    operativoData: { residuos },
  });

  it('es emergencia con un pendiente de 4+ días', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: false, dateTime: daysAgo(5) }]))).toBe(true);
  });
  it('no es emergencia con menos de 4 días', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: false, dateTime: daysAgo(2) }]))).toBe(false);
  });
  it('no es emergencia si el residuo viejo ya está recogido', () => {
    expect(isPuntoEmergencia(punto([{ id: 'r1', recogido: true, dateTime: daysAgo(9) }]))).toBe(false);
  });
  it('no es emergencia si no es punto de acumulación', () => {
    expect(isPuntoEmergencia({ operativoSubtipo: 'AMBIENTAL' } as any)).toBe(false);
  });
});

describe('isPuntoRecogido', () => {
  const punto = (residuos: any[]): any => ({
    operativoSubtipo: 'AMBIENTAL_PUNTOS_ACUMULACION',
    operativoData: { residuos },
  });

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
