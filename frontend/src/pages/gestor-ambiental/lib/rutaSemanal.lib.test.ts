import { describe, it, expect } from 'vitest';
import { paradaLiteFromParadaRuta, hidratarParadas, diasRestantesSemana, esLunesBogota } from './rutaSemanal.lib';

const PR = (id: string, barrio: string, visitado = false) => ({
  numeroGlobal: 1, numeroSegmento: 0, activityId: id, lat: 4.6, lng: -74.07,
  barrio, diasVencido: 3, tiposResiduo: ['RESIDUOS_ORDINARIOS'], visitado, diasSinSeguimiento: Infinity,
});

describe('paradaLiteFromParadaRuta', () => {
  it('reduce a los campos ParadaLite', () => {
    expect(paradaLiteFromParadaRuta(PR('a', 'LOURDES', true))).toEqual({
      activityId: 'a', lat: 4.6, lng: -74.07, barrio: 'LOURDES', visitado: true,
    });
  });
});

describe('hidratarParadas', () => {
  it('cruza dto.paradas con puntos actuales y prefiere el visitado recalculado en vivo', () => {
    const dto: any = { paradas: [{ activityId: 'a', lat: 4.6, lng: -74.07, barrio: 'LOURDES', visitado: true }] };
    const puntos = [PR('a', 'LOURDES', false)];
    const out = hidratarParadas(dto, puntos);
    expect(out[0].visitado).toBe(false);
    expect(out[0].tiposResiduo).toEqual(['RESIDUOS_ORDINARIOS']); // enriquecido del punto
  });
  it('cae al snapshot del backend cuando el punto ya no está en el pool actual', () => {
    const dto: any = { paradas: [{ activityId: 'unknown-id', lat: 4.7, lng: -74.08, barrio: 'OTRO', visitado: true }] };
    const puntos = [PR('a', 'LOURDES', false)];
    const out = hidratarParadas(dto, puntos);
    expect(out[0].diasVencido).toBe(0);
    expect(out[0].tiposResiduo).toEqual([]);
    expect(out[0].visitado).toBe(true);
    expect(out[0].diasSinSeguimiento).toBe(Infinity);
  });
});

describe('diasRestantesSemana', () => {
  it('cuenta días desde ahora hasta el fin (Bogotá)', () => {
    // fin domingo 2026-07-13T04:59:59.999Z ; ahora miércoles 2026-07-08T15:00Z
    expect(diasRestantesSemana('2026-07-13T04:59:59.999Z', new Date('2026-07-08T15:00:00Z'))).toBe(5);
  });
  it('retorna 0 cuando finISO está en el pasado', () => {
    expect(diasRestantesSemana('2026-07-06T04:59:59.999Z', new Date('2026-07-10T10:00:00Z'))).toBe(0);
  });
});

describe('esLunesBogota', () => {
  it('true un lunes en horario Bogotá', () => {
    expect(esLunesBogota(new Date('2026-07-06T15:00:00Z'))).toBe(true); // lunes 10:00 Bogotá
  });
  it('false un domingo', () => {
    expect(esLunesBogota(new Date('2026-07-12T15:00:00Z'))).toBe(false);
  });
  it('false cuando es domingo en Bogotá a pesar del lunes UTC temprano', () => {
    expect(esLunesBogota(new Date('2026-07-06T03:00:00Z'))).toBe(false); // domingo 22:00 Bogotá
  });
  it('true cuando es lunes en Bogotá temprano', () => {
    expect(esLunesBogota(new Date('2026-07-06T05:30:00Z'))).toBe(true); // lunes 00:30 Bogotá
  });
});
