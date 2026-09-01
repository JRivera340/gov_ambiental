import { describe, it, expect } from 'vitest';
import { paradaLiteFromParadaRuta, hidratarParadas, diasRestantesQuincena, diaDeQuincena, diasDeQuincena } from './rutaSemanal.lib';

const PR = (id: string, barrio: string, visitado = false) => ({
  numeroGlobal: 1, numeroSegmento: 0, puntoId: id, lat: 4.6, lng: -74.07,
  barrio, diasVencido: 3, tiposResiduo: ['RESIDUOS_ORDINARIOS'], visitado, diasSinSeguimiento: Infinity,
});

describe('paradaLiteFromParadaRuta', () => {
  it('reduce a los campos ParadaLite', () => {
    expect(paradaLiteFromParadaRuta(PR('a', 'LOURDES', true))).toEqual({
      puntoId: 'a', lat: 4.6, lng: -74.07, barrio: 'LOURDES', visitado: true,
    });
  });
});

describe('hidratarParadas', () => {
  it('cruza dto.paradas con puntos actuales y prefiere el visitado recalculado en vivo', () => {
    const dto: any = { paradas: [{ puntoId: 'a', lat: 4.6, lng: -74.07, barrio: 'LOURDES', visitado: true }] };
    const puntos = [PR('a', 'LOURDES', false)];
    const out = hidratarParadas(dto, puntos);
    expect(out[0].visitado).toBe(false);
    expect(out[0].tiposResiduo).toEqual(['RESIDUOS_ORDINARIOS']); // enriquecido del punto
  });
  it('descarta las paradas de puntos que ya no son del gestor', () => {
    const dto: any = { paradas: [
      { puntoId: 'a', lat: 4.6, lng: -74.07, barrio: 'LOURDES', visitado: false },
      { puntoId: 'reasignado', lat: 4.7, lng: -74.08, barrio: 'OTRO', visitado: true },
    ] };
    const out = hidratarParadas(dto, [PR('a', 'LOURDES', false)]);
    expect(out.map((p) => p.puntoId)).toEqual(['a']);
    expect(out[0].numeroGlobal).toBe(1);
  });

  it('cae al snapshot del backend mientras el pool de puntos no llegó', () => {
    const dto: any = { paradas: [{ puntoId: 'unknown-id', lat: 4.7, lng: -74.08, barrio: 'OTRO', visitado: true }] };
    const out = hidratarParadas(dto, []);
    expect(out[0].diasVencido).toBe(0);
    expect(out[0].tiposResiduo).toEqual([]);
    expect(out[0].visitado).toBe(true);
    expect(out[0].diasSinSeguimiento).toBe(Infinity);
  });
});

describe('diasRestantesQuincena', () => {
  it('cuenta dias desde ahora hasta el fin de la quincena', () => {
    // Fin de la quincena del 1 al 15 de agosto; ahora el 10.
    expect(diasRestantesQuincena('2026-08-16T04:59:59.999Z', new Date('2026-08-10T15:00:00Z'))).toBe(6);
  });
  it('retorna 0 cuando finISO esta en el pasado', () => {
    expect(diasRestantesQuincena('2026-08-16T04:59:59.999Z', new Date('2026-08-20T10:00:00Z'))).toBe(0);
  });
});

// La quincena es de calendario, asi que su largo cambia con el mes. Estos
// helpers no pueden asumir 14 dias.
describe('diasDeQuincena', () => {
  it('la primera quincena tiene 15 dias', () => {
    expect(diasDeQuincena('2026-08-01T05:00:00.000Z', '2026-08-16T04:59:59.999Z')).toBe(15);
  });
  it('la segunda de un mes de 31 tiene 16', () => {
    expect(diasDeQuincena('2026-08-16T05:00:00.000Z', '2026-09-01T04:59:59.999Z')).toBe(16);
  });
  it('la segunda de febrero comun tiene 13', () => {
    expect(diasDeQuincena('2026-02-16T05:00:00.000Z', '2026-03-01T04:59:59.999Z')).toBe(13);
  });
  it('sin fechas da 0', () => {
    expect(diasDeQuincena(null, null)).toBe(0);
    expect(diasDeQuincena('2026-08-01T05:00:00.000Z', undefined)).toBe(0);
  });
});

describe('diaDeQuincena', () => {
  // Quincena del 1 al 15 de agosto.
  const inicioISO = '2026-08-01T05:00:00.000Z';
  const finISO = '2026-08-16T04:59:59.999Z';

  it('el primer dia es 1', () => {
    expect(diaDeQuincena(inicioISO, finISO, new Date('2026-08-01T15:00:00Z'))).toBe(1);
  });
  it('cuenta el dia corriente', () => {
    expect(diaDeQuincena(inicioISO, finISO, new Date('2026-08-09T15:00:00Z'))).toBe(9);
  });
  it('no pasa del largo real del periodo', () => {
    expect(diaDeQuincena(inicioISO, finISO, new Date('2026-09-30T15:00:00Z'))).toBe(15);
    // Segunda de febrero comun: 13 dias.
    expect(diaDeQuincena('2026-02-16T05:00:00.000Z', '2026-03-01T04:59:59.999Z', new Date('2026-06-01T15:00:00Z'))).toBe(13);
  });
  it('0 antes de que arranque y 0 sin plan cargado', () => {
    expect(diaDeQuincena(inicioISO, finISO, new Date('2026-07-31T15:00:00Z'))).toBe(0);
    expect(diaDeQuincena(null, null, new Date())).toBe(0);
  });
});
