import { describe, it, expect } from 'vitest';
import { paradaLiteFromParadaRuta, hidratarParadas, diasRestantesQuincena, diaDeQuincena } from './rutaSemanal.lib';

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
    // fin 2026-07-27T04:59:59.999Z ; ahora miercoles 2026-07-22T15:00Z
    expect(diasRestantesQuincena('2026-07-27T04:59:59.999Z', new Date('2026-07-22T15:00:00Z'))).toBe(5);
  });
  it('retorna 0 cuando finISO esta en el pasado', () => {
    expect(diasRestantesQuincena('2026-07-13T04:59:59.999Z', new Date('2026-07-20T10:00:00Z'))).toBe(0);
  });
});

describe('diaDeQuincena', () => {
  const inicioISO = '2026-07-13T05:00:00.000Z';

  it('el primer dia es 1', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-07-13T15:00:00Z'))).toBe(1);
  });
  it('la segunda semana sigue contando (dia 9, no dia 2)', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-07-21T15:00:00Z'))).toBe(9);
  });
  it('no pasa de 14', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-08-30T15:00:00Z'))).toBe(14);
  });
  it('0 antes de que arranque y 0 sin plan cargado', () => {
    expect(diaDeQuincena(inicioISO, new Date('2026-07-12T15:00:00Z'))).toBe(0);
    expect(diaDeQuincena(null, new Date())).toBe(0);
  });
});
